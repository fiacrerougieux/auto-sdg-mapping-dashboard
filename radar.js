function createRadar(data) {
  // Build hidden cumulative heatmap first
  createHeatmap(data, true);

  const sdgNumbers = Array.from({ length: 17 }, (_, i) => i + 1);
  const values = finalCumulativeValues || sdgNumbers.map(() => 0);
  const maxValue = Math.max(...values, 1);
  const percentages = values.map(v => (v / maxValue) * 100);

  // Close the shape for radar
  const labels = sdgNumbers.map(sdg => `SDG ${sdg} - ${constants.sdgNames[sdg]}`);
  labels.push(labels[0]);
  percentages.push(percentages[0]);

  const dimensions = getPlotDimensions();
  const plotData = [{
    type: 'scatterpolar',
    r: percentages,
    theta: labels,
    fill: 'toself',
    fillcolor: 'rgba(254, 204, 92, 0.3)',
    line: {
      color: 'rgb(240, 59, 32)',
      shape: 'spline',
      smoothing: 0.35,
      width: 2
    }
  }];

  const layout = {
    polar: {
      radialaxis: {
        visible: true,
        range: [0, 100],
        ticksuffix: '%',
        tickvals: [0, 25, 50, 75, 100],
        ticktext: ['0%', '25%', '50%', '75%', '100%'],
        tickfont: { size: 16 }
      },
      angularaxis: {
        tickfont: { size: 16 },
        rotation: 90,
        direction: "clockwise"
      }
    },
    showlegend: false,
    margin: { l: 300, r: 300, t: 100, b: 100 },
    width: dimensions.width,
    height: dimensions.height,
    paper_bgcolor: 'white',
    plot_bgcolor: 'white'
  };

  Plotly.newPlot('plot-container', plotData, layout);
}
