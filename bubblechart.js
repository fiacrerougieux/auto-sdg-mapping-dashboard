function createBubbleChart(data, selectedSDG = 1) {
  d3.select('#plot-container').html('');
  const margin = { top: 50, right: 50, bottom: 50, left: 50 };
  const width = document.getElementById('plot-container').offsetWidth - margin.left - margin.right;
  const height = document.getElementById('plot-container').offsetHeight - margin.top - margin.bottom;

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

  for (let i = 0; i < 120; i++) simulation.tick();

  const svg = d3.select('#plot-container')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Grid lines
  const gridLines = svg.append('g');
  for (let p = 0; p <= 100; p += 10) {
    gridLines.append('line')
      .attr('x1', xScale(p))
      .attr('x2', xScale(p))
      .attr('y1', 0)
      .attr('y2', height)
      .attr('stroke', '#dde')
      .attr('stroke-width', 2);

    gridLines.append('text')
      .attr('x', xScale(p))
      .attr('y', height + 20)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('fill', '#666')
      .text(p + '%');
  }

  const bubbles = svg.selectAll('circle')
    .data(bubbleData)
    .join('circle')
    .attr('cx', d => d.x)
    .attr('cy', d => d.y)
    .attr('r', d => radiusScale(d.value))
    .attr('fill', d => facultyColors[d.faculty] || '#999999')
    .attr('opacity', 0.7)
    .attr('stroke', '#fff')
    .attr('stroke-width', 2);

  // Bubble labels
  const labelsGroup = svg.append('g').attr('class', 'labels-group');
  const labels = labelsGroup.selectAll('.bubble-label')
    .data(bubbleData)
    .join('text')
    .attr('x', d => d.x)
    .attr('y', d => d.y)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .style('font-weight', 'bold')
    .style('fill', '#fff')
    .text(d => d.id)
    .style('font-size', d => {
      const fs = radiusScale(d.value) * 0.5;
      return `${Math.min(fs, 14)}px`;
    })
    .style('display', d => radiusScale(d.value) < 10 ? 'none' : 'block');

  // Toggle labels
  let labelsVisible = true;


  // Legend
  const legendGroup = svg.append('g')
    .attr('class', 'legend')
    .attr('transform', `translate(${width - 220},20)`);

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

  // Tooltip
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
