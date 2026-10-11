const Organization = require('../models/Organization');
// Haversine distance helper (in km)
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

exports.getOrganizations = async (req, res) => {
  try {
    const { search, type, lat, lng } = req.query;
    let query = { status: 'approved', isActive: true };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } }
      ];
    }
    
    if (type) {
      query.type = type;
    }

    let orgs = await Organization.find(query).lean();

    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      orgs = orgs.map(org => {
        if (org.location && org.location.latitude && org.location.longitude) {
          org.distance = getDistance(userLat, userLng, org.location.latitude, org.location.longitude);
        } else {
          org.distance = 999999;
        }
        return org;
      }).sort((a, b) => a.distance - b.distance);
    }

    res.json(orgs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMyOrganizations = async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const orgs = await Organization.find();
      return res.json(orgs);
    }
    // Staff
    const orgs = await Organization.find({ _id: { $in: req.user.organizations } });
    res.json(orgs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getOrganizationById = async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ message: 'Organization not found' });
    if (org.status !== 'approved' && req.user?.role !== 'admin' && !(req.user?.role === 'staff' && req.user.organizations.includes(org._id))) {
      return res.status(403).json({ message: 'Organization not available' });
    }
    res.json(org);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createOrganization = async (req, res) => {
  const { name, type, address, contactEmail, contactPhone, businessHours } = req.body;
  try {
    const org = new Organization({
      name,
      type,
      address,
      contactEmail,
      contactPhone,
      businessHours,
      owner: req.user._id,
      status: req.user.role === 'admin' ? 'approved' : 'pending' // Admin can auto-approve
    });
    const createdOrg = await org.save();
    res.status(201).json(createdOrg);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
