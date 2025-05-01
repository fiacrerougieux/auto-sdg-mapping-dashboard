function createRadar(data) {
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
  const values = finalCumulativeValues || sdgNumbers.map(() => 0);
  const maxValue = Math.max(...values, 1);
  const percentages = values.map(v => (v / maxValue) * 100);

  // Calculate dimensions based on the target div
  const margin = { top: 100, right: 300, bottom: 100, left: 300 };
  // Use the target div's dimensions
  const width = plotContainer.offsetWidth - margin.left - margin.right;
  const height = plotContainer.offsetHeight - margin.top - margin.bottom;
  const radius = Math.min(width, height) / 2;

  // Create SVG within the target div
  const svg = d3.select(`#${targetDivId}`)
    .append('svg')
    .attr('width', plotContainer.offsetWidth) // Use full div width for SVG
    .attr('height', plotContainer.offsetHeight) // Use full div height for SVG
    .append('g')
    // Center the radar chart within the SVG based on the div's dimensions
    .attr('transform', `translate(${plotContainer.offsetWidth / 2},${plotContainer.offsetHeight / 2})`);

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

  // Define SDG colors
  const sdgColors = {
    1: "#E5243B", // Red
    2: "#DDA63A", // Yellow
    3: "#4C9F38", // Green
    4: "#C5192D", // Red
    5: "#FF3A21", // Orange
    6: "#26BDE2", // Blue
    7: "#FCC30B", // Yellow
    8: "#A21942", // Burgundy
    9: "#FD6925", // Orange
    10: "#DD1367", // Pink
    11: "#FD9D24", // Gold
    12: "#BF8B2E", // Dark Gold
    13: "#3F7E44", // Dark Green
    14: "#0A97D9", // Blue
    15: "#56C02B", // Light Green
    16: "#00689D", // Blue
    17: "#19486A"  // Navy
  };
  
  // Create radar grid lines and axis labels
  const labels = sdgNumbers.map(sdg => `SDG ${sdg} - ${constants.sdgNames[sdg]}`);
  
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
      .attr('stroke', '#dde')
      .attr('stroke-width', 1);
    
    // Position icon and text at the periphery
    const labelRadius = radius + 40; // Increased radius for icon + text
    const iconX = labelRadius * Math.sin(angle);
    const iconY = -labelRadius * Math.cos(angle);
    
    // Create a group for the icon and text
    const labelGroup = svg.append('g')
      .attr('transform', `translate(${iconX},${iconY})`)
      .attr('cursor', 'pointer')
      .attr('data-sdg', sdgNumber)
      .on('click', function() {
        const sdgNum = d3.select(this).attr('data-sdg');
        // Update currentSDG
        currentSDG = parseInt(sdgNum);
        
        // Remove active class from all SDG icons in sidebar
        document.querySelectorAll('#sdgIconsList .sdg-icon-item').forEach(el => el.classList.remove('active'));
        
        // Add active class to the corresponding SDG icon in sidebar
        const sidebarIcon = document.querySelector(`#sdgIconsList .sdg-icon-item[data-sdg="${sdgNum}"]`);
        if (sidebarIcon) sidebarIcon.classList.add('active');
        
        // Switch to Bubble chart
        const bubbleBtn = document.querySelector('#sidebar .visualisation-icons #bubbleBtn');
        // Remove active class from all visualization buttons
        document.querySelectorAll('#sidebar .visualisation-icons button').forEach(button => {
          button.classList.remove('active');
        });
        // Add active class to the bubble button
        bubbleBtn.classList.add('active');
        
        // Load data and create bubble chart
        loadData().then(data => createBubbleChart(data, currentSDG));
      });
    
    // Add SDG icon
    labelGroup.append('image')
      .attr('xlink:href', `logo/E Inverted Icons_WEB-${(sdgNumber < 10 ? '0' : '') + sdgNumber}.png`)
      .attr('width', 30)
      .attr('height', 30)
      .attr('x', -15) // Center the icon
      .attr('y', -15);
    
    // Add text label with SDG color
    // Determine text position based on angle
    const textX = angle > Math.PI ? -25 : angle < Math.PI ? 25 : 0;
    const textAnchor = angle > Math.PI ? 'end' : angle < Math.PI ? 'start' : 'middle';
    
    // Get SDG name
    const sdgName = constants.sdgNames[sdgNumber];
    
    // Add text with SDG color
    labelGroup.append('text')
      .attr('x', textX)
      .attr('y', 0)
      .attr('text-anchor', textAnchor)
      .attr('dominant-baseline', 'middle')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .style('fill', sdgColors[sdgNumber])
      .text(sdgName);
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
