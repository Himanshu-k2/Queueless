const queueService = require('../services/queueService');

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
