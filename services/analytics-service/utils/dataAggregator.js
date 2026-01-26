const { startOfDay, startOfWeek, startOfMonth, startOfYear, format } = require('date-fns');

exports.groupByDay = (data, dateField = 'date') => {
  const grouped = {};
  
  data.forEach(item => {
    const date = new Date(item[dateField]);
    const key = format(startOfDay(date), 'yyyy-MM-dd');
    
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(item);
  });
  
  return grouped;
};

exports.groupByWeek = (data, dateField = 'date') => {
  const grouped = {};
  
  data.forEach(item => {
    const date = new Date(item[dateField]);
    const key = format(startOfWeek(date), 'yyyy-MM-dd');
    
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(item);
  });
  
  return grouped;
};

exports.groupByMonth = (data, dateField = 'date') => {
  const grouped = {};
  
  data.forEach(item => {
    const date = new Date(item[dateField]);
    const key = format(startOfMonth(date), 'yyyy-MM');
    
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(item);
  });
  
  return grouped;
};

exports.groupByYear = (data, dateField = 'date') => {
  const grouped = {};
  
  data.forEach(item => {
    const date = new Date(item[dateField]);
    const key = format(startOfYear(date), 'yyyy');
    
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(item);
  });
  
  return grouped;
};

exports.groupByField = (data, field) => {
  const grouped = {};
  
  data.forEach(item => {
    const key = item[field];
    
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(item);
  });
  
  return grouped;
};

exports.aggregateSum = (data, field) => {
  return data.reduce((sum, item) => sum + (parseFloat(item[field]) || 0), 0);
};

exports.aggregateAverage = (data, field) => {
  if (data.length === 0) return 0;
  const sum = exports.aggregateSum(data, field);
  return sum / data.length;
};

exports.aggregateCount = (data) => {
  return data.length;
};

exports.aggregateMin = (data, field) => {
  if (data.length === 0) return null;
  return Math.min(...data.map(item => parseFloat(item[field]) || 0));
};

exports.aggregateMax = (data, field) => {
  if (data.length === 0) return null;
  return Math.max(...data.map(item => parseFloat(item[field]) || 0));
};

exports.aggregateGrouped = (groupedData, aggregations) => {
  const result = {};
  
  Object.keys(groupedData).forEach(key => {
    const items = groupedData[key];
    result[key] = {};
    
    aggregations.forEach(agg => {
      switch (agg.type) {
        case 'sum':
          result[key][agg.field] = exports.aggregateSum(items, agg.field);
          break;
        case 'avg':
          result[key][agg.field] = exports.aggregateAverage(items, agg.field);
          break;
        case 'count':
          result[key][agg.field] = exports.aggregateCount(items);
          break;
        case 'min':
          result[key][agg.field] = exports.aggregateMin(items, agg.field);
          break;
        case 'max':
          result[key][agg.field] = exports.aggregateMax(items, agg.field);
          break;
        default:
          result[key][agg.field] = null;
      }
    });
  });
  
  return result;
};

exports.pivotData = (data, rowField, columnField, valueField, aggregateType = 'sum') => {
  const pivot = {};
  
  data.forEach(item => {
    const rowKey = item[rowField];
    const colKey = item[columnField];
    const value = parseFloat(item[valueField]) || 0;
    
    if (!pivot[rowKey]) {
      pivot[rowKey] = {};
    }
    
    if (!pivot[rowKey][colKey]) {
      pivot[rowKey][colKey] = [];
    }
    
    pivot[rowKey][colKey].push(value);
  });
  
  Object.keys(pivot).forEach(rowKey => {
    Object.keys(pivot[rowKey]).forEach(colKey => {
      const values = pivot[rowKey][colKey];
      
      switch (aggregateType) {
        case 'sum':
          pivot[rowKey][colKey] = values.reduce((sum, val) => sum + val, 0);
          break;
        case 'avg':
          pivot[rowKey][colKey] = values.reduce((sum, val) => sum + val, 0) / values.length;
          break;
        case 'count':
          pivot[rowKey][colKey] = values.length;
          break;
        case 'min':
          pivot[rowKey][colKey] = Math.min(...values);
          break;
        case 'max':
          pivot[rowKey][colKey] = Math.max(...values);
          break;
        default:
          pivot[rowKey][colKey] = values[0];
      }
    });
  });
  
  return pivot;
};

exports.filterByDateRange = (data, dateField, startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return data.filter(item => {
    const itemDate = new Date(item[dateField]);
    return itemDate >= start && itemDate <= end;
  });
};

exports.sortByField = (data, field, order = 'asc') => {
  return [...data].sort((a, b) => {
    const valA = a[field];
    const valB = b[field];
    
    if (order === 'asc') {
      return valA > valB ? 1 : valA < valB ? -1 : 0;
    } else {
      return valA < valB ? 1 : valA > valB ? -1 : 0;
    }
  });
};
