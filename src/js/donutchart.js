function createDonutChart(data, animateTransition = false) {
  const targetDivId = 'donut-chart-div';
  const containerElement = document.getElementById(targetDivId);
  if (!containerElement) {
    console.error(`Target container #${targetDivId} not found.`);
    return;
  }

  // Clear previous chart
  d3.select(`#${targetDivId}`).select('svg').remove();
  d3.select('body').selectAll('.donut-tooltip').remove();

  const margin = { top: 20, right: 20, bottom: 20, left: 20 };
  const width = containerElement.offsetWidth - margin.left - margin.right;
  const height = containerElement.offsetHeight - margin.top - margin.bottom;
  const radius = Math.min(width, height) / 2;

  // --- Data Processing ---
  const sdgCounts = {};
  const uniqueCoursesPerSdg = {};

  data.forEach(row => {
    if (row.addressed) {
      if (!sdgCounts[row.sdg_number]) {
        sdgCounts[row.sdg_number] = 0;
        uniqueCoursesPerSdg[row.sdg_number] = new Set();
      }
      if (!uniqueCoursesPerSdg[row.sdg_number].has(row.course_code)) {
        sdgCounts[row.sdg_number]++;
        uniqueCoursesPerSdg[row.sdg_number].add(row.course_code);
      }
    }
  });

  const donutData = Object.keys(constants.sdgColors).map(sdg => {
    const sdgNum = parseInt(sdg);
    return {
      sdg: sdgNum,
      name: constants.sdgNames[sdgNum] || `SDG ${sdgNum}`,
      value: sdgCounts[sdgNum] || 0,
      color: constants.sdgColors[sdg]
    };
  }).filter(d => d.value > 0);

  // --- Theme Colors ---
  const isDarkTheme = document.body.classList.contains('dark-theme');
  const themeBgColor = isDarkTheme ? '#0a0e17' : '#ffffff';
  const themeTextColor = isDarkTheme ? '#00e8ff' : 'black';

  // --- SVG Setup ---
  const svg = d3.select(`#${targetDivId}`)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .style('background-color', themeBgColor)
    .append('g')
    .attr('transform', `translate(${(width / 2) + margin.left}, ${(height / 2) + margin.top})`);

  // --- Center Text ---
  svg.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '-0.3em')
    .style('font-size', '18px')
    .style('font-weight', 'bold')
    .style('fill', themeTextColor)
    .text('University Profile');

  // --- Donut Chart ---
  const pie = d3.pie()
    .value(d => d.value)
    .sort(null); // Keep original order

  const arc = d3.arc()
    .innerRadius(radius * 0.5) // This creates the donut hole
    .outerRadius(radius);

  const path = svg.selectAll('path')
    .data(pie(donutData))
    .enter().append('path')
    .attr('fill', d => d.data.color)
    .attr('stroke', themeBgColor)
    .attr('stroke-width', 2);

  if (animateTransition) {
    path.transition()
      .duration(1000)
      .attrTween('d', function(d) {
        const i = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
        return function(t) { return arc(i(t)); };
      });
  } else {
    path.attr('d', arc);
  }

  // --- Tooltip ---
  const tooltip = d3.select('body').append('div')
    .attr('class', 'tooltip donut-tooltip')
    .style('position', 'absolute')
    .style('visibility', 'hidden')
    .style('pointer-events', 'none');

  path.on('mouseover', function(event, d) {
      d3.select(this).attr('opacity', 0.8);
      tooltip.html(`<b>${d.data.name}</b><br>Courses: ${d.data.value}`)
        .style('visibility', 'visible');
    })
    .on('mousemove', function(event) {
      tooltip.style('top', (event.pageY - 10) + 'px')
        .style('left', (event.pageX + 10) + 'px');
    })
    .on('mouseout', function() {
      d3.select(this).attr('opacity', 1);
      tooltip.style('visibility', 'hidden');
    })
    .on('click', function(event, d) {
      currentSDG = d.data.sdg;
      tooltip.style('visibility', 'hidden'); // Hide tooltip before switching

      // Programmatically click the "Percentage of Courses Covering SDGs" tab button
      const bubbleTabButton = document.querySelector('.tab-button[data-tab-target="#tab2Content"]');
      if (bubbleTabButton) {
        bubbleTabButton.click();
      } else {
        console.error('Bubble chart tab button not found.');
      }
    })
    .style('cursor', 'pointer');
}
