const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

const width = 800;
const height = 600;

const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

exports.generateLineChart = async (data) => {
  const configuration = {
    type: 'line',
    data: {
      labels: data.labels || [],
      datasets: data.datasets || []
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: data.title || 'Graphique en ligne'
        },
        legend: {
          display: true,
          position: 'top'
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  };

  return await chartJSNodeCanvas.renderToBuffer(configuration);
};

exports.generateBarChart = async (data) => {
  const configuration = {
    type: 'bar',
    data: {
      labels: data.labels || [],
      datasets: data.datasets || []
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: data.title || 'Graphique en barres'
        },
        legend: {
          display: true,
          position: 'top'
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  };

  return await chartJSNodeCanvas.renderToBuffer(configuration);
};

exports.generatePieChart = async (data) => {
  const configuration = {
    type: 'pie',
    data: {
      labels: data.labels || [],
      datasets: data.datasets || []
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: data.title || 'Graphique circulaire'
        },
        legend: {
          display: true,
          position: 'right'
        }
      }
    }
  };

  return await chartJSNodeCanvas.renderToBuffer(configuration);
};

exports.generateDoughnutChart = async (data) => {
  const configuration = {
    type: 'doughnut',
    data: {
      labels: data.labels || [],
      datasets: data.datasets || []
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: data.title || 'Graphique en anneau'
        },
        legend: {
          display: true,
          position: 'right'
        }
      }
    }
  };

  return await chartJSNodeCanvas.renderToBuffer(configuration);
};

exports.generateMixedChart = async (data) => {
  const configuration = {
    type: 'bar',
    data: {
      labels: data.labels || [],
      datasets: data.datasets || []
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: data.title || 'Graphique mixte'
        },
        legend: {
          display: true,
          position: 'top'
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  };

  return await chartJSNodeCanvas.renderToBuffer(configuration);
};
