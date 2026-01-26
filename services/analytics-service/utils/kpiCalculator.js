exports.calculateVariation = (currentValue, previousValue) => {
  if (!previousValue || previousValue === 0) {
    return 0;
  }
  return ((currentValue - previousValue) / previousValue) * 100;
};

exports.determineTrend = (variation, threshold = 0) => {
  if (variation > threshold) return 'UP';
  if (variation < -threshold) return 'DOWN';
  return 'STABLE';
};

exports.calculateAverage = (values) => {
  if (!values || values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
};

exports.calculateMedian = (values) => {
  if (!values || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
};

exports.calculatePercentile = (values, percentile) => {
  if (!values || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index % 1;
  
  if (lower === upper) {
    return sorted[lower];
  }
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
};

exports.calculateGrowthRate = (currentValue, previousValue, periods = 1) => {
  if (!previousValue || previousValue === 0) return 0;
  return (Math.pow(currentValue / previousValue, 1 / periods) - 1) * 100;
};

exports.calculateCompoundGrowth = (values) => {
  if (!values || values.length < 2) return 0;
  const firstValue = values[0];
  const lastValue = values[values.length - 1];
  const periods = values.length - 1;
  
  return exports.calculateGrowthRate(lastValue, firstValue, periods);
};

exports.calculateMovingAverage = (values, window = 7) => {
  if (!values || values.length < window) return [];
  
  const result = [];
  for (let i = window - 1; i < values.length; i++) {
    const windowValues = values.slice(i - window + 1, i + 1);
    result.push(exports.calculateAverage(windowValues));
  }
  return result;
};

exports.calculateStandardDeviation = (values) => {
  if (!values || values.length === 0) return 0;
  const avg = exports.calculateAverage(values);
  const squareDiffs = values.map(value => Math.pow(value - avg, 2));
  const avgSquareDiff = exports.calculateAverage(squareDiffs);
  return Math.sqrt(avgSquareDiff);
};

exports.calculateCorrelation = (valuesX, valuesY) => {
  if (!valuesX || !valuesY || valuesX.length !== valuesY.length || valuesX.length === 0) {
    return 0;
  }

  const n = valuesX.length;
  const avgX = exports.calculateAverage(valuesX);
  const avgY = exports.calculateAverage(valuesY);

  let numerator = 0;
  let denominatorX = 0;
  let denominatorY = 0;

  for (let i = 0; i < n; i++) {
    const diffX = valuesX[i] - avgX;
    const diffY = valuesY[i] - avgY;
    numerator += diffX * diffY;
    denominatorX += diffX * diffX;
    denominatorY += diffY * diffY;
  }

  if (denominatorX === 0 || denominatorY === 0) return 0;

  return numerator / Math.sqrt(denominatorX * denominatorY);
};

exports.calculateROI = (gain, cost) => {
  if (!cost || cost === 0) return 0;
  return ((gain - cost) / cost) * 100;
};

exports.calculateConversionRate = (conversions, total) => {
  if (!total || total === 0) return 0;
  return (conversions / total) * 100;
};

exports.calculateChurnRate = (lost, total) => {
  if (!total || total === 0) return 0;
  return (lost / total) * 100;
};

exports.calculateRetentionRate = (retained, total) => {
  if (!total || total === 0) return 0;
  return (retained / total) * 100;
};
