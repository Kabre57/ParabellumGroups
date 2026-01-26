/**
 * Calculate work duration in hours between arrival and departure times
 * @param {Date} heureArrivee - Arrival time
 * @param {Date} heureDepart - Departure time
 * @returns {number} Duration in hours (decimal)
 */
exports.calculateDuration = (heureArrivee, heureDepart) => {
  if (!heureArrivee || !heureDepart) {
    return 0;
  }

  const arrival = new Date(heureArrivee);
  const departure = new Date(heureDepart);

  if (departure <= arrival) {
    return 0;
  }

  const diffMs = departure - arrival;
  const diffHours = diffMs / (1000 * 60 * 60);

  return Math.round(diffHours * 100) / 100; // Round to 2 decimal places
};

/**
 * Calculate total worked hours for a period
 * @param {Array} presences - Array of presence records
 * @returns {number} Total hours worked
 */
exports.calculateTotalHours = (presences) => {
  return presences.reduce((total, presence) => {
    return total + (parseFloat(presence.duree) || 0);
  }, 0);
};

/**
 * Calculate average daily hours
 * @param {Array} presences - Array of presence records
 * @returns {number} Average hours per day
 */
exports.calculateAverageDailyHours = (presences) => {
  if (!presences || presences.length === 0) {
    return 0;
  }

  const totalHours = exports.calculateTotalHours(presences);
  return Math.round((totalHours / presences.length) * 100) / 100;
};

/**
 * Calculate attendance statistics
 * @param {Array} presences - Array of presence records
 * @returns {Object} Statistics object
 */
exports.calculateStats = (presences) => {
  const totalDays = presences.length;
  const totalHours = exports.calculateTotalHours(presences);
  const averageHours = exports.calculateAverageDailyHours(presences);

  const byType = presences.reduce((acc, presence) => {
    acc[presence.type] = (acc[presence.type] || 0) + 1;
    return acc;
  }, {});

  return {
    totalDays,
    totalHours: Math.round(totalHours * 100) / 100,
    averageHours,
    byType
  };
};
