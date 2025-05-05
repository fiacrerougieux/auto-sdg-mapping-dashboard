function createRadar(data) {
  // Remove any existing tooltips from the body
  d3.select('body').select('.tooltip').remove();

  // Build hidden cumulative heatmap first to calculate values
  // This is okay as it doesn't draw anything visible, just calculates finalCumulativeValues
  createHeatmap(data, true);

  const targetDivId = 'radar-div'; // Target the specific div
  const plotContainer = document.getElementById(targetDivId);
  if (!plotContainer) {
    console.error(`Target container #${targetDivId} not found.`);
    return;
  }
  // Clear previous plot using D3 by selecting the target div
  d3.select(`#${targetDivId}`).html('');

  const sdgNumbers = Array.from({ length: 17 }, (_, i) => i + 1);
  const values = finalCumulativeValues || sdgNumbers.map(() => 0); // Use calculated cumulative values
  const maxValue = Math.max(...values, 1); // Ensure maxValue is at least 1
  const percentages = values.map(v => (v / maxValue) * 100); // Calculate percentages based on max value

  // Calculate dimensions based on the target div
  const margin = { top: 100, right: 100, bottom: 100, left: 100 }; // Adjusted margins for better spacing
  // Use the target div's dimensions
  const width = plotContainer.offsetWidth - margin.left - margin.right;
  const height = plotContainer.offsetHeight - margin.top - margin.bottom;
  const radius = Math.min(width, height) / 2; // Calculate radius based on available space

  // --- Determine theme colors ---
  const isDarkTheme = document.body.classList.contains('dark-theme');
  const themeTextColor = isDarkTheme ? '#00e8ff' : 'black';
  const themeBgColor = isDarkTheme ? '#0a0e17' : '#ffffff';
  const themeGridColor = isDarkTheme ? '#2a3446' : '#dde'; // Darker grid for dark theme
  const themeGridTextColor = isDarkTheme ? '#88a0cc' : '#666'; // Lighter grey/blue for dark theme grid text
  const themeRadarFillColor = isDarkTheme ? 'rgba(0, 232, 255, 0.3)' : 'rgba(0, 123, 255, 0.3)'; // Cyan fill for dark
  const themeRadarStrokeColor = isDarkTheme ? '#00e8ff' : '#007bff'; // Cyan stroke for dark

  // Create SVG within the target div
  const svg = d3.select(`#${targetDivId}`)
    .append('svg')
    .attr('width', plotContainer.offsetWidth) // Use full div width for SVG
    .attr('height', plotContainer.offsetHeight) // Use full div height for SVG
    .style('background-color', themeBgColor) // Apply theme background color
    .append('g')
    // Center the radar chart within the SVG based on the div's dimensions
    .attr('transform', `translate(${plotContainer.offsetWidth / 2},${plotContainer.offsetHeight / 2})`);

  // Create scales
  const angleScale = d3.scaleLinear()
    .domain([0, sdgNumbers.length])
    .range([0, 2 * Math.PI]);

  const radiusScale = d3.scaleLinear()
    .domain([0, 100]) // Scale based on percentage
    .range([0, radius]);

  // Create radar grid circles
  const gridCircles = [0, 25, 50, 75, 100];
  gridCircles.forEach(value => {
    svg.append('circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', radiusScale(value))
      .attr('fill', 'none')
      .attr('stroke', themeGridColor) // Apply theme grid color
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,4');

    // Add labels for grid circles (only if value > 0)
    if (value > 0) {
      svg.append('text')
        .attr('x', 0)
        .attr('y', -radiusScale(value))
        .attr('dy', -4) // Adjust position slightly
        .attr('text-anchor', 'middle')
        .style('font-size', '10px') // Smaller font size
        .style('fill', themeGridTextColor) // Apply theme grid text color
        .text(`${value}%`);
    }
  });

  // Define SDG colors (used for axis labels)
  const sdgColors = {
    1: "#E5243B", 2: "#DDA63A", 3: "#4C9F38", 4: "#C5192D", 5: "#FF3A21",
    6: "#26BDE2", 7: "#FCC30B", 8: "#A21942", 9: "#FD6925", 10: "#DD1367",
    11: "#FD9D24", 12: "#BF8B2E", 13: "#3F7E44", 14: "#0A97D9", 15: "#56C02B",
    16: "#00689D", 17: "#19486A"
  };

  // Create radar grid lines and axis labels
  const labels = sdgNumbers.map(sdg => constants.sdgNames[sdg] || `SDG ${sdg}`); // Use SDG names

  labels.forEach((label, i) => {
    const angle = angleScale(i);
    const lineX = radius * Math.sin(angle);
    const lineY = -radius * Math.cos(angle);
    const sdgNumber = sdgNumbers[i];

    // Draw axis line
    svg.append('line')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', lineX)
      .attr('y2', lineY)
      .attr('stroke', themeGridColor) // Apply theme grid color
      .attr('stroke-width', 1);

    // Position icon and text at the periphery
    const labelRadius = radius + 35; // Adjusted radius for icon + text
    const iconX = labelRadius * Math.sin(angle);
    const iconY = -labelRadius * Math.cos(angle);

    // Create a group for the icon and text
    const labelGroup = svg.append('g')
      .attr('transform', `translate(${iconX},${iconY})`)
      .attr('cursor', 'pointer')
      .attr('data-sdg', sdgNumber)
      .on('click', function() {
        const sdgNum = d3.select(this).attr('data-sdg');
        currentSDG = parseInt(sdgNum);

        // Update top bar icons
        document.querySelectorAll('#sdgIconsList .sdg-icon-item').forEach(el => el.classList.remove('active'));
        const topBarIcon = document.querySelector(`#sdgIconsList .sdg-icon-item[data-sdg="${sdgNum}"]`);
        if (topBarIcon) topBarIcon.classList.add('active');

        // Switch to Bubble chart
        previousChartType = currentChartType;
        currentChartType = 'bubble';
        document.getElementById('bubble-chart-div').style.display = 'block'; // Ensure bubble div is visible
        document.querySelectorAll('#plot-container-bottom .chart-div').forEach(div => div.style.display = 'none'); // Hide bottom charts

        loadData().then(data => createBubbleChart(data, currentSDG, true)); // Animate transition
      });

    // Add SDG icon
    labelGroup.append('image')
      .attr('xlink:href', `logo/E Inverted Icons_WEB-${(sdgNumber < 10 ? '0' : '') + sdgNumber}.png`)
      .attr('width', 25) // Smaller icon
      .attr('height', 25)
      .attr('x', -12.5) // Center the icon
      .attr('y', -12.5);

    // Add text label below the icon
    labelGroup.append('text')
      .attr('x', 0) // Center text below icon
      .attr('y', 20) // Position below icon
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('font-size', '10px') // Smaller font
      .style('font-weight', 'bold')
      .style('fill', sdgColors[sdgNumber]) // Use SDG color for label
      .text(label); // Use SDG name
  });

  // Create radar path with spline for smoother curve
  const radarLine = d3.lineRadial()
    .curve(d3.curveCardinalClosed.tension(0.5))
    .angle((_, i) => angleScale(i))
    .radius(d => radiusScale(d)); // Scale based on percentage

  // Create data points for the radar (using percentages)
  const radarData = percentages.map((value, i) => ({
    value: value,
    angle: angleScale(i),
    label: labels[i], // Use SDG name
    sdg: sdgNumbers[i]
  }));

  // Draw radar area
  svg.append('path')
    .datum(percentages) // Use percentages for the path
    .attr('d', radarLine)
    .attr('fill', themeRadarFillColor) // Apply theme fill color
    .attr('stroke', themeRadarStrokeColor) // Apply theme stroke color
    .attr('stroke-width', 2);

  // Add data points
  svg.selectAll('.radar-point')
    .data(radarData)
    .join('circle')
    .attr('class', 'radar-point')
    .attr('cx', d => radiusScale(d.value) * Math.sin(d.angle))
    .attr('cy', d => -radiusScale(d.value) * Math.cos(d.angle))
    .attr('r', 4) // Smaller points
    .attr('fill', themeRadarStrokeColor); // Use theme stroke color for points

  // Create tooltip
  const tooltip = d3.select('body').append('div')
    .attr('class', 'tooltip radar-tooltip') // Use specific class if needed
    .style('position', 'absolute')
    .style('visibility', 'hidden')
    .style('pointer-events', 'none'); // CSS handles theme styles

  // Add tooltip interaction using Voronoi for better hover detection
  const voronoiDiagram = d3.Delaunay
    .from(radarData,
      d => radiusScale(d.value) * Math.sin(d.angle),
      d => -radiusScale(d.value) * Math.cos(d.angle))
    .voronoi([-radius, -radius, radius, radius]); // Define bounds

  svg.append('g')
    .selectAll('path')
    .data(radarData)
    .join('path')
    .attr('d', (d, i) => voronoiDiagram.renderCell(i))
    .attr('fill', 'none') // Make Voronoi cells invisible
    .attr('pointer-events', 'all') // Capture mouse events
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
