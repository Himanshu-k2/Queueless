// Utility functions
exports.generateTokenNumber = (prefix = 'T') => {
  return `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
};
