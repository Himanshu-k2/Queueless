const QueueEntry = require('../models/QueueEntry');
const QueueRule = require('../models/QueueRule');
const Service = require('../models/Service');

class QueueEngine {
  async getRule(orgId) {
    let rule = await QueueRule.findOne({ organization: orgId });
    if (!rule) {
      rule = new QueueRule({ organization: orgId }); // Fallback to defaults
    }
    return rule;
  }

  isWithinWindow(timeStr, startStr, endStr) {
    if (!startStr || !endStr) return false;
    const t = timeStr;
    return t >= startStr && t < endStr;
  }

  getCurrentTime24() {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  }

  async joinQueue(customerId, orgId, serviceId) {
    const rule = await this.getRule(orgId);
    
    // Check Allocation Window constraint (Hospital specific logic encapsulated via rule)
    if (rule.allocationWindow?.enabled) {
      const now24 = this.getCurrentTime24();
      if (this.isWithinWindow(now24, rule.allocationWindow.startTime, rule.allocationWindow.endTime)) {
        throw new Error(`Queue is currently closed for priority allocations. Normal booking resumes at ${rule.allocationWindow.endTime}.`);
      }
    }
    
    // Prevent duplicate assignment
    const activeEntry = await QueueEntry.findOne({
      customer: customerId,
      service: serviceId,
      status: { $in: ['waiting', 'called', 'serving'] }
    });

    if (activeEntry) {
      throw new Error('Customer is already active in this queue.');
    }

    // Check max queue size & Waitlist (Diagnostic Lab specific logic encapsulated via rule)
    const currentQueueSize = await QueueEntry.countDocuments({
      service: serviceId,
      status: 'waiting'
    });

    let isWaitlisted = false;
    if (currentQueueSize >= rule.maxQueueSize) {
      if (rule.waitlist?.enabled) {
        const waitlistSize = await QueueEntry.countDocuments({ service: serviceId, status: 'waiting', isWaitlisted: true });
        if (waitlistSize >= rule.waitlist.maxCapacity) {
          throw new Error('Queue and waitlist are currently at maximum capacity.');
        }
        isWaitlisted = true;
      } else {
        throw new Error('Queue is currently at maximum capacity.');
      }
    }

    // Token generation
    const prefix = isWaitlisted ? 'WL' : 'TKN';
    const tokenNumber = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;

    const entry = await QueueEntry.create({
      customer: customerId,
      organization: orgId,
      service: serviceId,
      tokenNumber,
      status: 'waiting',
      isWaitlisted,
      joinedAt: new Date()
    });

    try {
      const io = require('../socket').getIo();
      io.to(`queue_${serviceId}`).emit('queue_updated');
      io.to(`user_${customerId}`).emit('user_updated');
    } catch (e) {
      console.log('Socket not initialized or failed to emit');
    }

    return entry;
  }

  async processCarryForward(orgId) {
    const rule = await this.getRule(orgId);
    if (!rule.allocationWindow?.carryForwardEnabled) {
      return { message: 'Carry forward is not enabled for this organization.' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find morning unserved patients (e.g. joined before morningCutoffTime today)
    const [cutoffHour, cutoffMin] = (rule.allocationWindow.morningCutoffTime || "13:00").split(':').map(Number);
    const cutoffDate = new Date(today);
    cutoffDate.setHours(cutoffHour, cutoffMin, 0, 0);

    const unservedEntries = await QueueEntry.find({
      organization: orgId,
      status: 'waiting',
      joinedAt: { $gte: today, $lt: cutoffDate }
    });

    let allocatedCount = 0;
    for (const entry of unservedEntries) {
      entry.priorityScore = 100; // Boost priority
      await entry.save();
      allocatedCount++;
    }

    return { message: `Carried forward ${allocatedCount} patients to evening priority.` };
  }

  async getQueueStatus(entryId) {
    const entry = await QueueEntry.findById(entryId).populate('service');
    if (!entry) throw new Error('Queue entry not found.');

    const rule = await this.getRule(entry.organization);

    // Calculate people ahead based on Strategy
    let query = {
      service: entry.service._id,
      status: 'waiting',
    };

    if (rule.strategy === 'PRIORITY') {
      query.$or = [
        { priorityScore: { $gt: entry.priorityScore } },
        { priorityScore: entry.priorityScore, joinedAt: { $lt: entry.joinedAt } }
      ];
    } else {
      query.joinedAt = { $lt: entry.joinedAt };
    }

    const peopleAheadCount = await QueueEntry.countDocuments(query);

    const currentServing = await QueueEntry.findOne({
      service: entry.service._id,
      status: { $in: ['called', 'serving'] }
    }).sort({ calledAt: -1 });

    const avgTime = entry.service.estimatedDuration || 15;
    const estimatedWaitTime = peopleAheadCount * avgTime;

    return {
      entry,
      peopleAhead: peopleAheadCount,
      estimatedWaitTime,
      currentServingToken: currentServing ? currentServing.tokenNumber : null
    };
  }

  async callNext(orgId, serviceId) {
    const rule = await this.getRule(orgId);

    const sortOrder = rule.strategy === 'PRIORITY' 
      ? { priorityScore: -1, joinedAt: 1 } 
      : { joinedAt: 1 };

    // Atomically find the next waiting entry and mark it as called to prevent race conditions
    const nextEntry = await QueueEntry.findOneAndUpdate(
      { service: serviceId, status: 'waiting' },
      { 
        $set: { 
          status: 'called', 
          calledAt: new Date(),
          isWaitlisted: false
        } 
      },
      { sort: sortOrder, new: true }
    );

    if (!nextEntry) {
      return null; // Queue is empty
    }

    try {
      const io = require('../socket').getIo();
      io.to(`queue_${serviceId}`).emit('queue_updated');
      io.to(`user_${nextEntry.customer}`).emit('user_updated');
    } catch (e) {}

    return nextEntry;
  }

  async updateStatus(entryId, newStatus) {
    const entry = await QueueEntry.findById(entryId).populate('service');
    if (!entry) throw new Error('Queue entry not found.');

    if (newStatus === 'serving') {
      entry.servedAt = new Date();
    } else if (newStatus === 'completed') {
      entry.completedAt = new Date();
    } else if (newStatus === 'skipped') {
      const rule = await this.getRule(entry.organization);
    }

    entry.status = newStatus;
    await entry.save();

    try {
      const io = require('../socket').getIo();
      io.to(`queue_${entry.service._id}`).emit('queue_updated');
      io.to(`user_${entry.customer}`).emit('user_updated');
    } catch (e) {}

    const shouldAutoCallNext = ['completed', 'skipped', 'no-show', 'cancelled'].includes(newStatus);
    return { entry, shouldAutoCallNext };
  }
  
  async getActiveList(orgId, serviceId) {
    const rule = await this.getRule(orgId);
    const sortOrder = rule.strategy === 'PRIORITY' ? { priorityScore: -1, joinedAt: 1 } : { joinedAt: 1 };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await QueueEntry.find({
      organization: orgId,
      service: serviceId,
      joinedAt: { $gte: today, $lt: tomorrow }
    })
    .populate('customer', 'name email')
    .sort(sortOrder);
  }
}

module.exports = new QueueEngine();
