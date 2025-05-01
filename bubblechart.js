function createBubbleChart(data, selectedSDG = 1, animateTransition = false) {
  // Tooltip removal - always remove the old one from the body
  d3.select('body').select('.tooltip').remove(); // Keep removing old tooltip from body

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
      percentage: (hits / total) * 100,
      faculty: constants.facultyMapping[spec] || 'OTHER'
    };
  }).filter(d => d.value > 0)
    .sort((a, b) => a.percentage - b.percentage);

  // Always set x-axis from 0 to 100 as requested
  const xScale = d3.scaleLinear()
    .domain([0, 100])
    .range([0, width]);
  const radiusScale = d3.scaleSqrt()
    .domain([0, d3.max(bubbleData, d => d.value)])
    .range([5, 40]);

  const simulation = d3.forceSimulation(bubbleData)
    .force('x', d3.forceX(d => xScale(d.percentage)).strength(1))
    .force('y', d3.forceY(height / 2).strength(0.1))
    .force('collision', d3.forceCollide().radius(d => radiusScale(d.value) + 1))
    .stop();

  for (let i = 0; i < 120; i++) simulation.tick(); // Calculate positions

  // --- SVG and G selection/creation ---
  const container = d3.select(`#${targetDivId}`); // Select the specific div
  let svg = container.select('svg'); // Look for SVG within this div
  let g;
  let initialCreate = svg.empty(); // Check if SVG needs creation within this div

  if (initialCreate) {
      animateTransition = false; // No transition on initial creation
      svg = container.append('svg');
      g = svg.append('g')
          .attr('transform', `translate(${margin.left},${margin.top})`);

      // Add grid lines group only once on creation
      g.append('g').attr('class', 'grid-lines');
      // Add legend group only once on creation
      g.append('g').attr('class', 'legend');
      // Add labels group only once on creation
      g.append('g').attr('class', 'labels-group');
      // Add title group only once on creation
      g.append('g').attr('class', 'chart-title');

  } else { // If SVG exists, just select the main group 'g'
      g = svg.select('g');
  }

  // Update SVG/g dimensions (handles resize and ensures consistency)
  svg.attr('width', width + margin.left + margin.right)
     .attr('height', height + margin.top + margin.bottom);
  g.attr('transform', `translate(${margin.left},${margin.top})`); // Ensure group transform is correct
  
  // Add or update chart title
  const titleGroup = g.select('.chart-title');
  titleGroup.selectAll('text').remove(); // Remove existing title if any
  titleGroup.append('text')
    .attr('x', width / 2)
    .attr('y', -20)
    .attr('text-anchor', 'middle')
    .style('font-size', '18px')
    .style('font-weight', 'bold')
    .text('Percentage of SDG in specialisations');

  // --- Grid Lines Update/Creation ---
  const gridLines = g.select('.grid-lines');
  for (let p = 0; p <= 100; p += 10) {
    gridLines.append('line')
      .attr('x1', xScale(p))
      .attr('x2', xScale(p))
      .attr('y1', 0)
      .attr('y2', height)
      .attr('stroke', '#dde')
      .attr('stroke-width', 2);

    // Add text only if it doesn't exist (or handle update)
    let text = gridLines.selectAll(`.grid-text-${p}`).data([p]);
    text.enter()
      .append('text')
      .attr('class', `grid-text-${p}`)
      .attr('x', xScale(p))
      .attr('y', height + 20)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('fill', '#666')
      .text(d => d + '%') // Use data bound
      .merge(text) // Update existing text position if needed (e.g., on resize)
      .attr('x', xScale(p))
      .attr('y', height + 20);
  }
  // --- End Grid Lines ---


  // --- Legend Update/Creation ---
  const legendGroup = g.select('.legend')
      .attr('transform', `translate(${width - 220},20)`); // Update position

  if (initialCreate) { // Only create legend content initially
      legendGroup.append('rect')
          .attr('width', 180)
          .attr('height', Object.keys(facultyColors).length * 25 + 10)
          .attr('fill', 'white')
          .attr('stroke', '#fff')
          .attr('rx', 5).attr('ry', 5)
          .style('opacity', 0.9);

      const legendItems = legendGroup.selectAll('.legend-item')
          .data(Object.entries(facultyColors))
          .join('g')
          .attr('class', 'legend-item')
          .attr('transform', (d, i) => `translate(10,${i * 25 + 15})`);

      legendItems.append('circle')
          .attr('r', 6)
          .attr('fill', d => d[1])
          .attr('opacity', 0.7)
          .attr('stroke', '#fff')
          .attr('stroke-width', 1);

      legendItems.append('text')
          .attr('x', 15)
          .attr('y', 5)
          .style('font-size', '16px')
          .text(d => constants.facultyNames[d[0]] || d[0]);
  }
  // --- End Legend ---


  const transitionDuration = animateTransition ? 750 : 0; // Duration for animation or 0 for none

  // --- Bubbles Update/Creation ---
  // Select circles within the persistent 'g'
  const bubbles = g.selectAll('circle.bubble') // Use class selector
    .data(bubbleData, d => d.id)
    .join(
      enter => enter.append('circle')
        .attr('class', 'bubble') // Add class on enter
        .attr('cx', d => d.x) // Initial position from simulation
        .attr('cy', d => d.y) // Initial position from simulation
        .attr('r', 0) // Start with radius 0 for entering bubbles
        .attr('fill', d => facultyColors[d.faculty] || '#999999')
        .attr('opacity', 0.7)
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .call(enter => enter.transition().duration(transitionDuration) // Animate radius on enter
          .attr('r', d => radiusScale(d.value))) // Transition radius in
          .style('cursor', 'pointer'), // Add cursor style on enter
      update => update
        .call(update => update.transition().duration(transitionDuration)
          // Transition position, radius, and fill on update
          .attr('cx', d => d.x)
          .attr('cy', d => d.y)
          .attr('r', d => radiusScale(d.value))
          .attr('fill', d => facultyColors[d.faculty] || '#999999')
        ),
      exit => exit
        // Add cursor style removal if needed, though removing the element handles it
        .call(exit => exit.transition().duration(transitionDuration) // Animate radius on exit
          .attr('r', 0)
          .remove()) // Remove after transition
    );

  // --- Labels Update/Creation ---
  const labelsGroup = g.select('.labels-group'); // Select existing group

  // Clear existing labels first to avoid stacking issues
  labelsGroup.selectAll('.bubble-label').remove();
  
  // Create labels with improved visibility
  labelsGroup.selectAll('.bubble-label')
    .data(bubbleData, d => d.id)
    .join(
      enter => enter.append('text')
        .attr('class', 'bubble-label')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .style('font-weight', 'bold')
        .style('fill', '#000')
        .style('stroke', '#000')  // Add black outline back
        .style('stroke-width', '1px')  // Make it slightly thicker
        .style('pointer-events', 'none') // Prevent labels interfering with bubble clicks
        .attr('x', d => d.x) // Initial position
        .attr('y', d => d.y)
        .text(d => d.id)
        .style('font-size', d => `${Math.min(radiusScale(d.value) * 0.6, 16)}px`) // Slightly larger font
        .style('display', d => radiusScale(d.value) < 8 ? 'none' : 'block') // Show more labels
        .style('opacity', 0) // Start transparent
        .call(enter => enter.transition().duration(transitionDuration*4)
          .style('opacity', 1)), // Fade in
      update => update
        // Apply non-transitioning styles first
        .style('pointer-events', 'none') // Ensure pointer-events are set on update too
        .style('fill', '#fff')
        .style('stroke', '#000')  // Add black outline back for updates too
        .style('stroke-width', '1px')  // Make it slightly thicker
        .text(d => d.id) // Update text content during updates too
        .style('font-size', d => `${Math.min(radiusScale(d.value) * 0.6, 16)}px`)
        .style('display', d => radiusScale(d.value) < 8 ? 'none' : 'block')
        .style('opacity', 1) // Ensure final opacity is 1
        // Then apply transitions
        .call(update => update.transition().duration(transitionDuration)
          .attr('x', d => d.x) // Transition position
          .attr('y', d => d.y)
        ),
      exit => exit
        .call(exit => exit.transition().duration(transitionDuration)
          .style('opacity', 0) // Fade out
          .remove())
    );
  // --- End Labels ---


  // --- Tooltip ---
  // Create tooltip (appends to body, safe to recreate)
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
    // When a bubble is clicked, switch to binary heatmap view of that specialization
    currentDiscipline = d.id;
    
    // Update the discipline select dropdown
    const select = document.getElementById('disciplineSelect');
    for (let i = 0; i < select.options.length; i++) {
      if (select.options[i].value === d.id) {
        select.selectedIndex = i;
        break;
      }
    }
    
    // Hide the tooltip before switching views to prevent it from staying visible
    tooltip.style('visibility', 'hidden');
    
    // Switch to binary heatmap view
    document.querySelector('#sidebar .visualisation-icons #heatmapBtn').click();
  })
  .style('cursor', 'pointer'); // Change cursor to indicate clickable
}
