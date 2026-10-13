const queueService = require('../services/queueService');
const QueueEntry = require('../models/QueueEntry');

exports.joinQueue = async (req, res) => {
  const { organization, service } = req.body;
  try {
    if (!organization || !service) {
      return res.status(400).json({ message: 'Organization and Service are required.' });
    }
    const entry = await queueService.joinQueue(req.user._id, organization, service);
    res.status(201).json(entry);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getQueueStatus = async (req, res) => {
  try {
    const status = await queueService.getQueueStatus(req.params.id);
    // Ensure the customer requesting is the owner or staff
    if (status.entry.customer.toString() !== req.user._id.toString() && 
        req.user.role === 'customer') {
      return res.status(403).json({ message: 'Not authorized to view this queue entry.' });
    }
    res.json(status);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

exports.callNext = async (req, res) => {
  const { organization, service } = req.body;
  try {
    const nextEntry = await queueService.callNext(organization, service);
    if (!nextEntry) {
      return res.status(404).json({ message: 'Queue is empty.' });
    }
    res.json({ message: `Called token ${nextEntry.tokenNumber}`, entry: nextEntry });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateQueueStatus = async (req, res) => {
  const { status, autoCallNext } = req.body;
  try {
    const validStatuses = ['called', 'serving', 'completed', 'skipped', 'no-show', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status.' });
    }

    // Role-based authorization
    const entryStatus = await queueService.getQueueStatus(req.params.id);
    const isOwner = entryStatus.entry.customer.toString() === req.user._id.toString();
    const isStaff = req.user.role === 'staff';
    const isAdmin = req.user.role === 'admin';

    if (req.user.role === 'customer') {
      if (!isOwner) return res.status(403).json({ message: 'Not authorized to modify this queue entry.' });
      if (status !== 'cancelled') return res.status(403).json({ message: 'Customers can only cancel their queue entries.' });
    } else if (isStaff) {
      const userOrgs = req.user.organizations.map(id => id.toString());
      if (!userOrgs.includes(entryStatus.entry.organization.toString())) {
        return res.status(403).json({ message: 'You are not authorized to manage this organization\'s queue.' });
      }
    } else if (!isAdmin) {
      return res.status(403).json({ message: 'Not authorized.' });
    }

    const result = await queueService.updateStatus(req.params.id, status);
    let nextEntry = null;

    // Optional: automatically call next if staff requests it and the current is done
    if ((isStaff || isAdmin) && autoCallNext && result.shouldAutoCallNext) {
      nextEntry = await queueService.callNext(result.entry.organization, result.entry.service._id);
    }

    res.json({ 
      message: `Status updated to ${status}.`,
      entry: result.entry,
      nextEntry
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getActiveQueue = async (req, res) => {
  const { orgId, serviceId } = req.query;
  try {
    const list = await queueService.getActiveList(orgId, serviceId);
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.processCarryForward = async (req, res) => {
  const { orgId } = req.body;
  try {
    const result = await queueService.processCarryForward(orgId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMyQueues = async (req, res) => {
  try {
    const activeEntries = await QueueEntry.find({
      customer: req.user._id,
      status: { $in: ['waiting', 'called', 'serving'] }
    })
    .populate('organization', 'name type address')
    .populate('service', 'name estimatedDuration type')
    .sort({ joinedAt: -1 });

    const detailedEntries = await Promise.all(activeEntries.map(async (entry) => {
      try {
        const queueStatus = await queueService.getQueueStatus(entry._id);
        return {
          _id: entry._id,
          id: entry._id,
          tokenNumber: entry.tokenNumber,
          status: entry.status,
          organization: entry.organization,
          service: entry.service,
          joinedAt: entry.joinedAt,
          calledAt: entry.calledAt,
          servedAt: entry.servedAt,
          peopleAhead: queueStatus.peopleAhead,
          estimatedWaitTime: queueStatus.estimatedWaitTime,
          currentServingToken: queueStatus.currentServingToken,
          isWaitlisted: entry.isWaitlisted
        };
      } catch (err) {
        return {
          _id: entry._id,
          id: entry._id,
          tokenNumber: entry.tokenNumber,
          status: entry.status,
          organization: entry.organization,
          service: entry.service,
          joinedAt: entry.joinedAt,
          peopleAhead: 0,
          estimatedWaitTime: 0,
          currentServingToken: null,
          isWaitlisted: entry.isWaitlisted
        };
      }
    }));

    res.json(detailedEntries);
  } catch (error) {
    console.error('Error fetching customer active queues:', error);
    res.status(500).json({ message: 'Failed to fetch active queues.' });
  }
};
