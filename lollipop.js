function createLollipop(data) {
  // Remove any existing tooltips from the body
  d3.select('body').select('.tooltip').remove();

  // Build hidden cumulative heatmap first to calculate values
  // This is okay as it doesn't draw anything visible, just calculates finalCumulativeValues
  createHeatmap(data, true);

  const targetDivId = 'radar-div'; // Keep using the same div for now
  const plotContainer = document.getElementById(targetDivId);
  if (!plotContainer) {
    console.error(`Target container #${targetDivId} not found.`);
    return;
  }
  // Clear previous plot using D3 by selecting the target div
  d3.select(`#${targetDivId}`).html('');

  // Filter out SDG 4 (as done in heatmap.js)
  const sdgNumbers = Array.from({ length: 17 }, (_, i) => i + 1).filter(sdg => sdg !== 4);

  // Calculate total number of courses for the current discipline.
  // This ensures the percentage calculation is based on the relevant subset of courses.
  let relevantDataForTotalCourses = data; // 'data' is the argument to createLollipop
  if (typeof filterDataByDiscipline === 'function' && typeof currentDiscipline !== 'undefined' && currentDiscipline !== "All") {
    relevantDataForTotalCourses = filterDataByDiscipline(data, currentDiscipline);
  }
  
  const uniqueCourseCodesForPercentage = new Set();
  relevantDataForTotalCourses.forEach(row => {
    uniqueCourseCodesForPercentage.add(row.course_code);
  });
  const totalCoursesForPercentage = uniqueCourseCodesForPercentage.size > 0 ? uniqueCourseCodesForPercentage.size : 1; // Avoid division by zero

  const rawCounts = finalCumulativeValues || sdgNumbers.map(() => 0); // These are raw counts from heatmap
  
  // Calculate true coverage percentages: (count for SDG / total relevant courses) * 100
  // This avoids normalizing by the max count among SDGs.
  const percentages = rawCounts.map(count => (count / totalCoursesForPercentage) * 100);

  // Calculate dimensions
  const margin = { top: 20, right: 20, bottom: 40, left: 50 }; // Increased bottom margin
  const width = plotContainer.offsetWidth - margin.left - margin.right;
  const height = plotContainer.offsetHeight - margin.top - margin.bottom;

  // --- Determine theme colors ---
  const isDarkTheme = document.body.classList.contains('dark-theme');
  const themeTextColor = isDarkTheme ? '#00e8ff' : 'black';
  const themeBgColor = isDarkTheme ? '#0a0e17' : '#ffffff';
  const themeGridColor = isDarkTheme ? '#2a3446' : '#dde'; // Darker grid for dark theme
  const themeGridTextColor = isDarkTheme ? '#88a0cc' : '#666'; // Lighter grey/blue for dark theme grid text
  const themeLollipopColor = isDarkTheme ? '#00e8ff' : '#007bff'; // Cyan for dark, blue for light

  // Define SDG colors (used for axis labels)
  const sdgColors = {
    1: "#E5243B", 2: "#DDA63A", 3: "#4C9F38", 4: "#C5192D", 5: "#FF3A21",
    6: "#26BDE2", 7: "#FCC30B", 8: "#A21942", 9: "#FD6925", 10: "#DD1367",
    11: "#FD9D24", 12: "#BF8B2E", 13: "#3F7E44", 14: "#0A97D9", 15: "#56C02B",
    16: "#00689D", 17: "#19486A"
  };

  // Create SVG within the target div
  const svg = d3.select(`#${targetDivId}`)
    .append('svg')
    .attr('width', plotContainer.offsetWidth) // Use full div width for SVG
    .attr('height', plotContainer.offsetHeight) // Use full div height for SVG
    .style('background-color', themeBgColor) // Apply theme background color
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Create scales - inverted axes (SDG on x-axis, percentage on y-axis)
  const xScale = d3.scaleBand()
    .domain(sdgNumbers.map(d => d.toString())) // Use SDG numbers as strings for the domain
    .range([0, width])
    .padding(0.3);

  const yScale = d3.scaleLinear()
    .domain([0, 100]) // Scale based on percentage (0-100%)
    .range([height, 0]) // Invert range for y-axis (higher values at top)
    .nice();

  // Create axes
  const xAxis = d3.axisBottom(xScale);
  
  const yAxis = d3.axisLeft(yScale)
    .ticks(5)
    .tickFormat(d => `${d}%`);

  // Add x-axis
  const xAxisGroup = svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(xAxis);

  // Style the existing x-axis text elements (SDG numbers)
  xAxisGroup.selectAll('text')
    .style('text-anchor', 'middle')
    .style('fill', themeTextColor)
    .style('font-size', '10px')
    .attr('dy', '1em'); // Position text slightly below the tick line

  // Style x-axis path and lines (ticks)
  xAxisGroup.select('.domain').style('stroke', themeGridColor); // Axis line
  xAxisGroup.selectAll('.tick line').style('stroke', themeGridColor); // Tick marks

  // Add X Axis Label
  svg.append("text")
    .attr("class", "x axis-label")
    .attr("text-anchor", "middle")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 10) // Positioned within the new bottom margin
    .style("fill", themeTextColor)
    .style("font-size", "12px")
    .text("SDG");
  
  // Add y-axis
  const yAxisGroup = svg.append('g')
    .call(yAxis);
  
  yAxisGroup.selectAll('text')
    .style('fill', themeGridTextColor);

  // Add Y Axis Label
  svg.append("text")
    .attr("class", "y axis-label")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left + 15) // Position to the left of the axis
    .attr("x", 0 - (height / 2))
    .attr("text-anchor", "middle")
    .style("fill", themeTextColor)
    .style("font-size", "12px")
    .text("Coverage (%)");

  // Add grid lines
  svg.append('g')
    .call(yAxis.tickSize(-width).tickFormat(''))
    .attr('class', 'grid')
    .selectAll('line')
    .style('stroke', themeGridColor)
    .style('stroke-dasharray', '3,3');
    
  // Add click handler to x-axis tick groups
  xAxisGroup.selectAll('.tick') // Ensure click handler is on the tick group
    .style('cursor', 'pointer')
    .on('click', function(event, d) { // d is the domain value (e.g., "1", "2")
      const sdgNum = parseInt(d);
      currentSDG = sdgNum;

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

  // Create data for the lollipop chart
  const lollipopData = sdgNumbers.map((sdg, i) => ({
    sdg: sdg,
    value: percentages[i] || 0,
    name: constants.sdgNames[sdg] || `SDG ${sdg}`
  }));

  // Add lines (the "stick" of the lollipop)
  svg.selectAll('.lollipop-line')
    .data(lollipopData)
    .join('line')
    .attr('class', 'lollipop-line')
    .attr('x1', d => xScale(d.sdg.toString()) + xScale.bandwidth() / 2)
    .attr('x2', d => xScale(d.sdg.toString()) + xScale.bandwidth() / 2)
    .attr('y1', height) // Start from the bottom (0%)
    .attr('y2', d => yScale(d.value)) // End at the value's height
    .attr('stroke', themeLollipopColor)
    .attr('stroke-width', 2);

  // Add circles (the "pop" of the lollipop)
  svg.selectAll('.lollipop-circle')
    .data(lollipopData)
    .join('circle')
    .attr('class', 'lollipop-circle')
    .attr('cx', d => xScale(d.sdg.toString()) + xScale.bandwidth() / 2)
    .attr('cy', d => yScale(d.value))
    .attr('r', 6)
    .attr('fill', themeLollipopColor) // Use theme blue/cyan color
    .attr('stroke', themeBgColor) // Use background color for stroke for better contrast
    .attr('stroke-width', 1.5);

  // Add value labels (SDG number if value > 0)
  svg.selectAll('.lollipop-label')
    .data(lollipopData)
    .join('text')
    .attr('class', 'lollipop-label')
    .attr('x', d => xScale(d.sdg.toString()) + xScale.bandwidth() / 2)
    .attr('y', d => yScale(d.value) - 10) // Position above the circle
    .attr('text-anchor', 'middle') // Center text above the circle
    .style('fill', themeTextColor)
    .style('font-size', '10px')
    .text(d => d.value > 0 ? d.sdg : ''); // Show SDG number if value > 0, else empty

  // Create tooltip
  const tooltip = d3.select('body').append('div')
    .attr('class', 'tooltip lollipop-tooltip')
    .style('position', 'absolute')
    .style('visibility', 'hidden')
    .style('pointer-events', 'none');

  // Add tooltip interaction
  svg.selectAll('.lollipop-circle')
    .on('mouseover', function(event, d) {
      d3.select(this)
        .attr('r', 8)
        .attr('stroke-width', 2);
      
      tooltip.html(`<b>${d.name}</b><br>Coverage: ${d.value.toFixed(2)}%`)
        .style('visibility', 'visible');
    })
    .on('mousemove', function(event) {
      tooltip.style('top', (event.pageY - 10) + 'px')
             .style('left', (event.pageX + 10) + 'px');
    })
    .on('mouseout', function() {
      d3.select(this)
        .attr('r', 6)
        .attr('stroke-width', 1);
      
      tooltip.style('visibility', 'hidden');
    });
}
