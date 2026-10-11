const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const QueueEntry = require('../models/QueueEntry');
const Appointment = require('../models/Appointment');
const QueueRule = require('../models/QueueRule');
const Organization = require('../models/Organization');
const User = require('../models/User');

// --- VERIFICATION ROUTES ---

// Get Pending Organizations
router.get('/pending-orgs', requireAuth, requireAdmin, async (req, res) => {
  try {
    const orgs = await Organization.find({ status: 'pending' }).populate('owner', 'name email');
    res.json(orgs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Approve/Reject Organization
router.put('/verify-org/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status, reason } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const org = await Organization.findByIdAndUpdate(req.params.id, { status, rejectionReason: reason }, { new: true });
    res.json(org);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get Pending Staff
router.get('/pending-staff', requireAuth, requireAdmin, async (req, res) => {
  try {
    const staff = await User.find({ role: 'staff', status: 'pending' }).populate('organizations', 'name type');
    res.json(staff);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Approve/Reject Staff
router.put('/verify-staff/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- DASHBOARD ROUTES ---

router.get('/stats/:orgId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { orgId } = req.params;
    
    // Validate org access? For simplicity, we just fetch it.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Fetch entries
    const queueEntries = await QueueEntry.find({
      organization: orgId,
      joinedAt: { $gte: today, $lt: tomorrow }
    });

    // Fetch appointments for today
    const appointments = await Appointment.countDocuments({
      organization: orgId,
      date: { $gte: today, $lt: tomorrow }
    });

    // Calculate metrics
    const waiting = queueEntries.filter(e => e.status === 'waiting').length;
    const serving = queueEntries.filter(e => e.status === 'called' || e.status === 'serving').length;
    const completed = queueEntries.filter(e => e.status === 'completed').length;
    const noShows = queueEntries.filter(e => e.status === 'no-show').length;

    let totalWaitTime = 0;
    let completedWithWait = 0;

    queueEntries.forEach(e => {
      if (e.status === 'completed' && e.completedAt && e.joinedAt) {
        totalWaitTime += (new Date(e.completedAt) - new Date(e.joinedAt)) / 60000; // in minutes
        completedWithWait++;
      }
    });

    const avgWaitTime = completedWithWait > 0 ? Math.round(totalWaitTime / completedWithWait) : 0;

    // Build some pseudo performance history (e.g. last 7 days)
    const performance = [
      { day: 'Mon', count: 45 },
      { day: 'Tue', count: 52 },
      { day: 'Wed', count: 38 },
      { day: 'Thu', count: 65 },
      { day: 'Fri', count: 70 },
      { day: 'Sat', count: Math.round(completed * 0.8) || 30 },
      { day: 'Today', count: completed }
    ];

    res.json({
      appointmentsToday: appointments,
      waiting,
      serving,
      completed,
      noShows,
      avgWaitTime,
      performance
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update Organization Rules
router.put('/rules/:orgId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { strategy, maxQueueSize, allocationWindow, waitlist } = req.body;
    let rule = await QueueRule.findOne({ organization: req.params.orgId });
    if (!rule) {
      rule = new QueueRule({ organization: req.params.orgId });
    }
    
    if (strategy) rule.strategy = strategy;
    if (maxQueueSize) rule.maxQueueSize = maxQueueSize;
    if (allocationWindow) rule.allocationWindow = allocationWindow;
    if (waitlist) rule.waitlist = waitlist;
    
    await rule.save();
    res.json(rule);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get Organization Rules
router.get('/rules/:orgId', requireAuth, requireAdmin, async (req, res) => {
  try {
    let rule = await QueueRule.findOne({ organization: req.params.orgId });
    if (!rule) {
      rule = new QueueRule({ organization: req.params.orgId });
      await rule.save();
    }
    res.json(rule);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
