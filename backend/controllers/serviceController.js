const Service = require('../models/Service');

exports.getServicesByOrg = async (req, res) => {
  try {
    const services = await Service.find({ organization: req.params.orgId, isActive: true });
    res.json(services);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createService = async (req, res) => {
  const { name, description, organization, type, estimatedDuration } = req.body;
  try {
    const service = new Service({
      name,
      description,
      organization,
      type,
      estimatedDuration
    });
    const createdService = await service.save();
    res.status(201).json(createdService);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
