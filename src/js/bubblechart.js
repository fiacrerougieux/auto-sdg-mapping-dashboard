function createBubbleChart(data, selectedSDG = 1, animateTransition = false) {
  // Tooltip removal - only remove the bubble chart tooltip from the body
  d3.select('body').select('.bubble-tooltip').remove(); // Keep removing old bubble tooltip from body

  const targetDivId = 'bubble-chart-div'; // Target the specific div
  const containerElement = document.getElementById(targetDivId);
  if (!containerElement) {
    console.error(`Target container #${targetDivId} not found.`);
    return;
  }

  const margin = { top: 50, right: 50, bottom: 50, left: 50 };
  // Calculate dimensions based on the target div
  const width = containerElement.offsetWidth - margin.left - margin.right;
  const height = containerElement.offsetHeight - margin.top - margin.bottom;

  const facultyColors = {
    'ADA': '#2C3E50',
    'BUSINESS': '#E74C3C',
    'ENG': '#3498DB',
    'LAW': '#8E44AD',
    'MED': '#16A085',
    'SCIENCE': '#27AE60',
    'CANBERRA': '#F39C12'
  };

  // Build spec -> set of courses, and spec -> set of courses that address selected SDG
  const specCounts = {};
  const sdgCounts = {};
  data.forEach(row => {
    const spec = row.course_code.substring(0, 4);
    if (!specCounts[spec]) {
      specCounts[spec] = new Set();
      sdgCounts[spec] = new Set();
    }
    specCounts[spec].add(row.course_code);
    if (row.sdg_number === selectedSDG && row.addressed) {
      sdgCounts[spec].add(row.course_code);
    }
  });

  // Filter out data not in currentFaculty if not ALL
  data = (currentFaculty === 'ALL') ? data : data.filter(row => {
    return constants.facultyMapping[row.course_code.substring(0, 4)] === currentFaculty;
  });

  const bubbleData = Object.keys(specCounts).map(spec => {
    const total = specCounts[spec].size;
    const hits = sdgCounts[spec].size;
    return {
      id: spec,
      name: constants.specializationNames[spec] || spec,
      value: total,
      sdgCount: hits,
      percentage: total > 0 ? (hits / total) * 100 : 0, // Avoid division by zero
      faculty: constants.facultyMapping[spec] || 'OTHER'
    };
  }).filter(d => d.value > 0)
    .sort((a, b) => a.percentage - b.percentage);

  // Set x-axis from -5 to 100 to show all 0 values
  const xScale = d3.scaleLinear()
    .domain([-5, 100])
    .range([0, width]);

  // --- Responsive Radius Scale ---
  const baseWidth = 1000; // Reference width for max radius
  const baseMaxRadius = 25; // Further reduced base max radius (was 40, then 30)
  const baseMinRadius = 3;  // Further reduced base min radius (was 5, then 4)
  const minAllowedMaxRadius = 10; // Further adjusted smallest max radius allowed (was 15, then 12)
  const minAllowedMinRadius = 2;  // Further adjusted smallest min radius allowed (was 3)

  // Calculate scaled radius but cap it at the original base values for larger screens
  const scaledMaxRadius = baseMaxRadius * (width / baseWidth);
  const scaledMinRadius = baseMinRadius * (width / baseWidth);

  const currentMaxRadius = Math.min(baseMaxRadius, Math.max(minAllowedMaxRadius, scaledMaxRadius)); // Cap at baseMaxRadius
  const currentMinRadius = Math.min(baseMinRadius, Math.max(minAllowedMinRadius, scaledMinRadius)); // Cap at baseMinRadius

  const radiusScale = d3.scaleSqrt()
    .domain([0, d3.max(bubbleData, d => d.value)])
    .range([currentMinRadius, currentMaxRadius]); // Use dynamic range
  // --- End Responsive Radius Scale ---

  const simulation = d3.forceSimulation(bubbleData)
    .force('x', d3.forceX(d => xScale(d.percentage)).strength(1))
    .force('y', d3.forceY(height / 2).strength(0.1))
    .force('collision', d3.forceCollide().radius(d => radiusScale(d.value) + 1)) // Add padding to collision radius
    .stop();

  // Run simulation sufficiently
  for (let i = 0; i < 300; i++) simulation.tick(); // Increased ticks for better stability

  // --- Determine theme colors ---
  const isDarkTheme = document.body.classList.contains('dark-theme');
  const themeTextColor = isDarkTheme ? '#00e8ff' : 'black';
  const themeBgColor = isDarkTheme ? '#0a0e17' : '#ffffff';
  const themeGridColor = isDarkTheme ? '#2a3446' : '#dde';
  const themeGridTextColor = isDarkTheme ? '#88a0cc' : '#666';
  const themeLegendBgColor = isDarkTheme ? 'rgba(18, 26, 41, 0.8)' : 'rgba(255, 255, 255, 0.9)';
  const themeLegendStrokeColor = isDarkTheme ? '#2a3446' : '#fff';
  const themeLegendTextColor = isDarkTheme ? '#00e8ff' : 'black';
  const themeBubbleLabelFillColor = isDarkTheme ? '#00e8ff' : '#fff';
  const themeBubbleLabelStrokeColor = isDarkTheme ? 'none' : '#000';
  const themeBubbleStrokeColor = isDarkTheme ? '#0a0e17' : '#fff'; // Match background

  // --- SVG and G selection/creation ---
  const container = d3.select(`#${targetDivId}`);
  let svg = container.select('svg');
  let g;
  let initialCreate = svg.empty();

  if (initialCreate) {
    animateTransition = false; // No transition on initial creation
    svg = container.append('svg');
    g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    // Add persistent groups only once
    g.append('g').attr('class', 'grid-lines');
    g.append('g').attr('class', 'legend');
    g.append('g').attr('class', 'labels-group');
    g.append('g').attr('class', 'chart-title');
  } else {
    g = svg.select('g'); // Select existing group
  }

  // Update SVG/g dimensions and background
  svg.attr('width', width + margin.left + margin.right)
     .attr('height', height + margin.top + margin.bottom)
     .style('background-color', themeBgColor); // Apply theme background color
  g.attr('transform', `translate(${margin.left},${margin.top})`);

  // Add or update chart title
  const titleGroup = g.select('.chart-title');
  titleGroup.selectAll('text').remove(); // Clear existing title
  titleGroup.append('text')
    .attr('x', width / 2)
    .attr('y', 0) // Position at the top of the plot area
    .attr('text-anchor', 'middle')
    .style('font-size', '18px')
    .style('font-weight', 'bold')
    .style('fill', themeTextColor) // Apply theme text color
    .text('Percentage of SDG in specialisations');

  // --- Grid Lines Update/Creation ---
  const gridLines = g.select('.grid-lines');
  gridLines.selectAll('*').remove(); // Clear previous grid lines
  for (let p = 0; p <= 100; p += 10) {
    gridLines.append('line')
      .attr('x1', xScale(p))
      .attr('x2', xScale(p))
      .attr('y1', 0) // Start from the top
      .attr('y2', height - 30) // Shorten the line by 30px from the bottom
      .attr('stroke', themeGridColor) // Apply theme grid color
      .attr('stroke-width', 1);

    gridLines.append('text')
      .attr('class', `grid-text-${p}`)
      .attr('x', xScale(p))
      .attr('y', height - 15) // Position just below the shortened grid lines (moved up)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', themeGridTextColor) // Apply theme grid text color
      .text(p + '%');
  }
  // --- End Grid Lines ---

  // --- Legend Update/Creation ---
  const legendGroup = g.select('.legend');
  legendGroup.selectAll('*').remove(); // Clear previous legend items

  const legendItemPadding = 60; // Significantly increased space between legend items (was 15, then 30)
  let currentX = 0;

  const legendItems = legendGroup.selectAll('.legend-item')
      .data(Object.entries(facultyColors))
      .join('g')
      .attr('class', 'legend-item'); // Create items first

  // Append elements to each item
  legendItems.append('circle')
      .attr('cx', 5) // Position circle at the start of the item
      .attr('cy', 0)
      .attr('r', 5)
      .attr('fill', d => d[1])
      .attr('opacity', 0.7)
      .attr('stroke', themeLegendStrokeColor)
      .attr('stroke-width', 1);

  legendItems.append('text')
      .attr('x', 15) // Position text next to the circle
      .attr('y', 0)
      .attr('dominant-baseline', 'middle')
      .style('font-size', '11px')
      .style('fill', themeLegendTextColor)
      .text(d => constants.facultyNames[d[0]] || d[0]);

  // --- Position legend items with wrapping ---
  let currentXPos = 0; // Use a different name to avoid conflict if 'currentX' is used elsewhere
  let currentYPos = 0;
  const lineHeight = 20; // Height of each legend line
  let maxLineWidth = 0;

  legendItems.attr('transform', function(d, i) {
      const itemWidth = this.getBBox().width;
      // Check if adding this item exceeds the chart width (consider padding)
      if (i > 0 && currentXPos + itemWidth + legendItemPadding > width) {
          // Move to the next line
          maxLineWidth = Math.max(maxLineWidth, currentXPos - legendItemPadding); // Store max width of the completed line
          currentXPos = 0; // Reset X for the new line
          currentYPos += lineHeight; // Move down
      }
      const tx = currentXPos;
      currentXPos += itemWidth + legendItemPadding; // Increment X for the next item
      return `translate(${tx}, ${currentYPos})`; // Apply position
  });
  // Calculate max width for the last line (or only line)
  maxLineWidth = Math.max(maxLineWidth, currentXPos > 0 ? currentXPos - legendItemPadding : 0);

  // Position the entire legend group below the tick labels, centered based on max line width
  const legendGroupX = (width / 2) - (maxLineWidth / 2); // Center based on the widest line
  const legendGroupY = height + 5; // Position below the tick labels (which are at height - 15)

  legendGroup.attr('transform', `translate(${legendGroupX}, ${legendGroupY})`);
  // --- End Legend ---

  const transitionDuration = animateTransition ? 1200 : 0; // Increased duration from 750ms

  // --- Bubbles Update/Creation with Transitions ---
  const bubbles = g.selectAll('circle.bubble')
    .data(bubbleData, d => d.id) // Use ID for object constancy
    .join(
      enter => enter.append('circle')
        .attr('class', 'bubble')
        .attr('cx', d => d.x) // Start at simulated position
        .attr('cy', d => d.y)
        .attr('r', 0) // Start with radius 0
        .attr('fill', d => facultyColors[d.faculty] || '#999999')
        .attr('opacity', 0.7)
        .attr('stroke', themeBubbleStrokeColor) // Use theme stroke
        .attr('stroke-width', 1)
        .style('cursor', 'pointer')
        .call(enter => enter.transition().duration(transitionDuration) // Transition radius in
          .attr('r', d => radiusScale(d.value))),
      update => update
        .call(update => update.transition().duration(transitionDuration) // Transition existing bubbles
          .attr('cx', d => d.x)
          .attr('cy', d => d.y)
          .attr('r', d => radiusScale(d.value))
          .attr('fill', d => facultyColors[d.faculty] || '#999999')
          .attr('stroke', themeBubbleStrokeColor) // Update stroke on update
        ),
      exit => exit
        .call(exit => exit.transition().duration(transitionDuration) // Transition radius out
          .attr('r', 0)
          .remove()) // Remove after transition
    );

  // --- Labels Update/Creation with Transitions ---
  const labelsGroup = g.select('.labels-group');
  labelsGroup.selectAll('.bubble-label').remove(); // Clear previous labels

  labelsGroup.selectAll('.bubble-label')
    .data(bubbleData, d => d.id) // Use ID for object constancy
    .join(
      enter => enter.append('text')
        .attr('class', 'bubble-label')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .style('font-weight', 'bold')
        .style('fill', themeBubbleLabelFillColor) // Apply theme label fill
        .style('stroke', themeBubbleLabelStrokeColor) // Apply theme label stroke
        .style('stroke-width', '0.5px')
        .style('paint-order', 'stroke')
        .style('pointer-events', 'none')
        .attr('x', d => d.x) // Initial position
        .attr('y', d => d.y)
        .text(d => d.id)
        .style('font-size', d => `${Math.max(5, Math.min(radiusScale(d.value) * 0.5, 12))}px`) // Ensure min size 5px
        .style('display', d => radiusScale(d.value) < 8 ? 'none' : 'block') // Hide small labels
        .style('opacity', 0) // Start transparent
        .call(enter => enter.transition().duration(transitionDuration * 1.5) // Fade in
          .style('opacity', 1)),
      update => update
        .style('pointer-events', 'none') // Ensure non-interactive
        .style('fill', themeBubbleLabelFillColor) // Update fill
        .style('stroke', themeBubbleLabelStrokeColor) // Update stroke
        .text(d => d.id) // Update text
        .style('font-size', d => `${Math.max(5, Math.min(radiusScale(d.value) * 0.5, 12))}px`)
        .style('display', d => radiusScale(d.value) < 8 ? 'none' : 'block')
        .style('opacity', 1) // Ensure opacity is 1 after potential fade-in
        .call(update => update.transition().duration(transitionDuration) // Transition position
          .attr('x', d => d.x)
          .attr('y', d => d.y)
        ),
      exit => exit
        .call(exit => exit.transition().duration(transitionDuration) // Fade out
          .style('opacity', 0)
          .remove()) // Remove after transition
    );
  // --- End Labels ---

  // --- Tooltip ---
  const tooltip = d3.select('body').append('div')
    .attr('class', 'tooltip bubble-tooltip') // CSS handles theme styles
    .style('position', 'absolute')
    .style('visibility', 'hidden')
    .style('pointer-events', 'none');

  // Tooltip event handlers for bubbles
  bubbles.on('mouseover', function(event, d) {
    tooltip.html(`<b>${d.name}</b><br>Total Courses: ${d.value}<br>Courses Addressing SDG ${selectedSDG}: ${d.sdgCount}<br>Percentage: ${d.percentage.toFixed(2)}%`)
      .style('visibility', 'visible');
  })
  .on('mousemove', function(event) {
    tooltip.style('top', (event.pageY - 10) + 'px')
           .style('left', (event.pageX + 10) + 'px');
  })
  .on('mouseout', function() {
    tooltip.style('visibility', 'hidden');
  })
  .on('click', function(event, d) {
    // Switch to heatmap view for the clicked specialization
    currentDiscipline = d.id;
    const searchInput = document.getElementById('disciplineSearch');
    const dropdown = document.getElementById('disciplineDropdown');
    searchInput.value = d.name; // Update search bar
    // Update dropdown active state
    dropdown.querySelectorAll('.dropdown-item').forEach(item => {
      item.classList.remove('active');
      if (item.getAttribute('data-value') === d.id) {
        item.classList.add('active');
      }
    });
    tooltip.style('visibility', 'hidden'); // Hide tooltip before switching
    // Programmatically click the "Heatmap & Lollipop" tab button
    const heatmapTabButton = document.querySelector('.tab-button[data-tab-target="#tab1Content"]');
    if (heatmapTabButton) {
      heatmapTabButton.click();
    } else {
      console.error('Heatmap & Lollipop tab button not found.');
    }
  })
  .style('cursor', 'pointer'); // Indicate clickable
}
