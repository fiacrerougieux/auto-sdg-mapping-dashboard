function createRadar(data) {
  // Build hidden cumulative heatmap first to calculate values
  createHeatmap(data, true);

  // Clear previous plot
  d3.select('#plot-container').html('');

  const sdgNumbers = Array.from({ length: 17 }, (_, i) => i + 1);
  const values = finalCumulativeValues || sdgNumbers.map(() => 0);
  const maxValue = Math.max(...values, 1);
  const percentages = values.map(v => (v / maxValue) * 100);

  // Calculate dimensions
  const margin = { top: 100, right: 300, bottom: 100, left: 300 };
  const dimensions = getPlotDimensions();
  const width = dimensions.width - margin.left - margin.right;
  const height = dimensions.height - margin.top - margin.bottom;
  const radius = Math.min(width, height) / 2;

  // Create SVG
  const svg = d3.select('#plot-container')
    .append('svg')
    .attr('width', dimensions.width)
    .attr('height', dimensions.height)
    .append('g')
    .attr('transform', `translate(${dimensions.width / 2},${dimensions.height / 2})`);

  // Create scales
  const angleScale = d3.scaleLinear()
    .domain([0, sdgNumbers.length])
    .range([0, 2 * Math.PI]);

  const radiusScale = d3.scaleLinear()
    .domain([0, 100])
    .range([0, radius]);

  // Create radar grid circles
  const gridCircles = [0, 25, 50, 75, 100];
  gridCircles.forEach(value => {
    svg.append('circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', radiusScale(value))
      .attr('fill', 'none')
      .attr('stroke', '#dde')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,4');
    
    // Add labels for grid circles
    svg.append('text')
      .attr('x', 0)
      .attr('y', -radiusScale(value))
      .attr('dy', -5)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('fill', '#666')
      .text(`${value}%`);
  });

  // Create radar grid lines and axis labels
  const labels = sdgNumbers.map(sdg => `SDG ${sdg} - ${constants.sdgNames[sdg]}`);
  
  labels.forEach((label, i) => {
    const angle = angleScale(i);
    const lineX = radius * Math.sin(angle);
    const lineY = -radius * Math.cos(angle);
    
    // Draw axis line
    svg.append('line')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', lineX)
      .attr('y2', lineY)
      .attr('stroke', '#dde')
      .attr('stroke-width', 1);
    
    // Position label horizontally at the periphery
    const labelRadius = radius + 20;
    const labelX = labelRadius * Math.sin(angle);
    const labelY = -labelRadius * Math.cos(angle);
    
    svg.append('text')
      .attr('x', labelX)
      .attr('y', labelY)
      .attr('text-anchor', angle > Math.PI ? 'end' : angle < Math.PI ? 'start' : 'middle')
      .attr('dominant-baseline', angle === 0 ? 'text-after-edge' : 
                                angle === Math.PI ? 'text-before-edge' : 'middle')
      // Remove rotation transform to keep text horizontal
      .style('font-size', '16px')
      .style('fill', '#666')
      .text(label);
  });

  // Create radar path with spline for smoother curve
  const radarLine = d3.lineRadial()
    .curve(d3.curveCardinalClosed.tension(0.5)) // Increased tension for smoother curve
    .angle((_, i) => angleScale(i))
    .radius(d => radiusScale(d));

  // Create data points for the radar
  const radarData = percentages.map((value, i) => ({
    value: value,
    angle: angleScale(i),
    label: labels[i],
    sdg: sdgNumbers[i]
  }));

  // Draw radar area with primary color from heatmap
  svg.append('path')
    .datum(percentages)
    .attr('d', radarLine)
    .attr('fill', 'rgba(0, 123, 255, 0.3)') // Primary color with opacity
    .attr('stroke', 'var(--primary-color)') // Primary color from CSS variables
    .attr('stroke-width', 2);

  // Add data points with primary color
  svg.selectAll('.radar-point')
    .data(radarData)
    .join('circle')
    .attr('class', 'radar-point')
    .attr('cx', d => radiusScale(d.value) * Math.sin(d.angle))
    .attr('cy', d => -radiusScale(d.value) * Math.cos(d.angle))
    .attr('r', 5)
    .attr('fill', 'var(--primary-color)');

  // Create tooltip (same as bubble chart)
  const tooltip = d3.select('body').append('div')
    .attr('class', 'tooltip')
    .style('position', 'absolute')
    .style('visibility', 'hidden')
    .style('background-color', 'rgba(var(--surface-color-rgb), 0.8)') /* Add alpha for transparency */
    .style('border', '1px solid var(--border-color)')
    .style('border-radius', '8px') // Increased border-radius for rounder corners
    .style('padding', '10px')
    .style('font-size', '14px')
    .style('color', 'var(--text-color)')
    .style('pointer-events', 'none'); // Important for tooltip not to interfere with mouse events

  // Add tooltip interaction to path and points
  svg.selectAll('.radar-point')
    .on('mouseover', function(event, d) {
      tooltip.html(`<b>${d.label}</b><br>Coverage: ${d.value.toFixed(2)}%`)
        .style('visibility', 'visible');
    })
    .on('mousemove', function(event) {
      tooltip.style('top', (event.pageY - 10) + 'px')
             .style('left', (event.pageX + 10) + 'px');
    })
    .on('mouseout', function() {
      tooltip.style('visibility', 'hidden');
    });

  // Make the entire radar area interactive for tooltips
  const voronoiDiagram = d3.Delaunay
    .from(radarData, 
      d => radiusScale(d.value) * Math.sin(d.angle), 
      d => -radiusScale(d.value) * Math.cos(d.angle))
    .voronoi([-radius, -radius, radius, radius]);

  svg.append('g')
    .selectAll('path')
    .data(radarData)
    .join('path')
    .attr('d', (d, i) => voronoiDiagram.renderCell(i))
    .attr('fill', 'none')
    .attr('pointer-events', 'all')
    .on('mouseover', function(event, d) {
      tooltip.html(`<b>${d.label}</b><br>Coverage: ${d.value.toFixed(2)}%`)
        .style('visibility', 'visible');
    })
    .on('mousemove', function(event) {
      tooltip.style('top', (event.pageY - 10) + 'px')
             .style('left', (event.pageX + 10) + 'px');
    })
    .on('mouseout', function() {
      tooltip.style('visibility', 'hidden');
    });
}
