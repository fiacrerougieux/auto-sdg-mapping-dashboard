let finalCumulativeValues = [];

function createHeatmap(data, isCumulative) {
  // Remove any existing heatmap tooltips from the body
  d3.select('body').select('.heatmap-tooltip').remove();

  const targetDivId = 'heatmap-div'; // Target the specific div
  const plotContainer = document.getElementById(targetDivId);
  if (!plotContainer) {
    console.error(`Target container #${targetDivId} not found.`);
    return;
  }
  // Clear previous plot using D3 by selecting the target div
  d3.select(`#${targetDivId}`).html(''); // Ensure div is empty before appending

  data = filterDataByDiscipline(data, currentDiscipline);

  const courseSDGs = {};
  data.forEach(row => {
    if (!courseSDGs[row.course_code]) {
      courseSDGs[row.course_code] = {};
      for (let i = 1; i <= 17; i++) {
        courseSDGs[row.course_code][i] = 0;
      }
    }
    if (row.addressed) {
      courseSDGs[row.course_code][row.sdg_number] = 1;
    }
  });

  const courseJustifications = {};
  data.forEach(row => {
    if (!courseJustifications[row.course_code]) {
      courseJustifications[row.course_code] = {};
    }
    if (row.addressed && row.justification) {
      courseJustifications[row.course_code][row.sdg_number] = row.justification;
    }
  });

  const courses = Object.keys(courseSDGs).sort((a, b) => {
    const yearA = getCourseYear(a);
    const yearB = getCourseYear(b);
    return yearA - yearB || a.localeCompare(b);
  });

  const sdgNumbers = Array.from({ length: 17 }, (_, i) => i + 1);

  // Create matrix data
  const matrix = [];
  for (let i = 0; i < sdgNumbers.length; i++) {
    const sdg = sdgNumbers[i];
    const row = [];

    if (isCumulative) {
      let sum = 0;
      for (let j = 0; j < courses.length; j++) {
        const course = courses[j];
        sum += courseSDGs[course][sdg];
        row.push({
          value: sum,
          sdg: sdg,
          course: course,
          addressed: courseSDGs[course][sdg] === 1,
          justification: courseJustifications[course]?.[sdg] || '',
          sdg_name: constants.sdgNames[sdg],
          target_number: '',
          target_name: ''
        });
      }
    } else {
      for (let j = 0; j < courses.length; j++) {
        const course = courses[j];
        const value = courseSDGs[course][sdg];
        const justification = courseJustifications[course]?.[sdg] || '';

        const originalRow = data.find(r => r.course_code === course && r.sdg_number === sdg);
        let targetNumber = '';
        let targetName = '';

        if (value && originalRow) {
          if (originalRow.target_number !== undefined) {
            targetNumber = originalRow.target_number;
          }
          if (originalRow.target_name !== undefined) {
            targetName = originalRow.target_name;
          }
        }

        row.push({
          value: value,
          sdg: sdg,
          course: course,
          addressed: value === 1,
          justification: justification,
          sdg_name: constants.sdgNames[sdg],
          target_number: targetNumber,
          target_name: targetName
        });
      }
    }

    matrix.push(row);
  }

  // Calculate dimensions based on the target div
  const margin = { top: 20, right: 50, bottom: 150, left: 350 }; // Increased left margin
  const width = plotContainer.offsetWidth - margin.left - margin.right;
  const height = plotContainer.offsetHeight - margin.top - margin.bottom;

  // Determine theme colors
  const isDarkTheme = document.body.classList.contains('dark-theme');
  const themeTextColor = isDarkTheme ? '#00e8ff' : 'black';
  const themeBgColor = isDarkTheme ? '#0a0e17' : '#ffffff'; // Dark theme background or white
  const themeGridTextColor = isDarkTheme ? '#88a0cc' : '#666'; // Lighter grey/blue for dark theme grid text
  const themeCellStrokeColor = isDarkTheme ? '#0a0e17' : '#fff'; // Match background for stroke
  const themeEmptyCellColor = isDarkTheme ? '#121a29' : '#f8f9fa'; // Slightly lighter dark for empty cells

  // Create SVG within the target div
  const svgElement = d3.select(`#${targetDivId}`)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom);
    // Removed inline background style - will handle with CSS

  const svg = svgElement.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Define scales
  const xScale = d3.scaleBand()
    .domain(courses.map((_, i) => i))
    .range([0, width])
    .padding(0.01);

  const yScale = d3.scaleBand()
    .domain(sdgNumbers.map((_, i) => i))
    .range([0, height])
    .padding(0.01);

  // Create heatmap cells
  for (let i = 0; i < matrix.length; i++) {
    const row = matrix[i];
    for (let j = 0; j < row.length; j++) {
      const cell = row[j];
      svg.append('rect')
        .attr('x', xScale(j))
        .attr('y', yScale(i))
        .attr('width', xScale.bandwidth())
        .attr('height', yScale.bandwidth())
        .attr('fill', function() {
          if (cell.value === 0) return themeEmptyCellColor; // Use theme empty cell color
          if (isCumulative) {
            const intensity = cell.value / (courses.length * 0.5);
            return `rgba(0, 123, 255, ${Math.min(0.3 + intensity * 0.7, 1)})`;
          } else {
            return 'var(--primary-color)';
          }
        })
        .attr('stroke', themeCellStrokeColor) // Use theme stroke color
        .attr('stroke-width', 1)
        .attr('data-sdg', cell.sdg)
        .attr('data-course', cell.course)
        .attr('data-value', cell.value)
        .attr('class', `sdg-cell sdg-${cell.sdg}`); // Removed hover/mouseout from here, will add later if needed for tooltip
    }
  }

  // Add x-axis with vertical labels
  const xAxisGroup = svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(xScale)
      .tickFormat(i => courses[i])
      .tickSize(0));

  xAxisGroup.selectAll('text')
    .attr('transform', 'rotate(90)')
    .style('text-anchor', 'start')
    .attr('dx', '0.8em')
    .attr('dy', '-0.15em')
    .style('font-size', '12px')
    .style('fill', themeGridTextColor); // Use theme grid text color

  xAxisGroup.select('.domain').remove(); // Remove axis line

  // Add y-axis with SDG icons instead of text
  const yAxisGroup = svg.append('g')
    .call(d3.axisLeft(yScale)
      .tickFormat(() => '')
      .tickSize(0));

  yAxisGroup.select('.domain').remove(); // Remove axis line

  // Define SDG colors (used for hover/click on labels)
  const sdgColors = {
    1: "#E5243B", 2: "#DDA63A", 3: "#4C9F38", 4: "#C5192D", 5: "#FF3A21",
    6: "#26BDE2", 7: "#FCC30B", 8: "#A21942", 9: "#FD6925", 10: "#DD1367",
    11: "#FD9D24", 12: "#BF8B2E", 13: "#3F7E44", 14: "#0A97D9", 15: "#56C02B",
    16: "#00689D", 17: "#19486A"
  };

  // Add SDG icons and text labels with click functionality
  const ticks = yAxisGroup.selectAll('.tick');

  // Add hover effects for each row (tick group)
  ticks.on('mouseover', function(event, d) {
    const sdgIndex = d; // The index passed by d3
    const sdgNumber = sdgNumbers[sdgIndex];
    const sdgColor = sdgColors[sdgNumber];
    d3.select(this).select('.sdg-label') // Target only the single label
      .attr('fill', sdgColor);
  })
  .on('mouseout', function() {
    d3.select(this).select('.sdg-label') // Target only the single label
      .attr('fill', themeTextColor); // Use theme text color
  });

  // Add text labels (single line)
  ticks.append('text')
    .attr('x', -10) // Adjust x position for the increased margin
    .attr('y', 0) // Center vertically
    .attr('text-anchor', 'end')
    .attr('dominant-baseline', 'middle')
    .attr('fill', themeTextColor) // Use theme color
    .attr('font-size', '12px')
    .attr('font-weight', 'bold')
    .attr('cursor', 'pointer')
    .attr('class', 'sdg-label')
    .attr('data-sdg', (d, i) => sdgNumbers[i])
    .text((d, i) => constants.sdgNames[sdgNumbers[i]] || `SDG ${sdgNumbers[i]}`) // Display full name
    .on('click', function(event, d) {
       const sdgNumber = d3.select(this).attr('data-sdg') || sdgNumbers[d]; // Get SDG number directly from label
       currentSDG = parseInt(sdgNumber);
       document.querySelectorAll('#sdgIconsList .sdg-icon-item').forEach(el => el.classList.remove('active'));
       const sidebarIcon = document.querySelector(`#sdgIconsList .sdg-icon-item[data-sdg="${sdgNumber}"]`);
       if (sidebarIcon) sidebarIcon.classList.add('active');
       previousChartType = currentChartType;
       currentChartType = 'bubble';
       document.getElementById('bubble-chart-div').style.display = 'block';
       document.querySelectorAll('#plot-container-bottom .chart-div').forEach(div => div.style.display = 'none');
       const shouldAnimate = previousChartType === 'bubble';
       loadData().then(data => createBubbleChart(data, currentSDG, shouldAnimate));
    });

  // Remove second line label code
  // Remove SDG icon code

  // Create tooltip
  const tooltip = d3.select('body').append('div')
    .attr('class', 'tooltip heatmap-tooltip') // CSS handles theme styles
    .style('position', 'absolute')
    .style('visibility', 'hidden')
    .style('pointer-events', 'none');

  // Add tooltip interaction - only for non-cumulative heatmap
  if (!isCumulative) {
    svg.selectAll('rect.sdg-cell') // Select only the data cells
      .on('mouseover', function(event) {
          // Get data from attributes instead of unreliable invert
          const rect = d3.select(this);
          const sdg = parseInt(rect.attr('data-sdg'));
          const course = rect.attr('data-course');

          // Find indices
          const sdgIndex = sdgNumbers.indexOf(sdg);
          const courseIndex = courses.indexOf(course);

          if (sdgIndex < 0 || courseIndex < 0) {
              console.warn("Could not find indices for tooltip", sdg, course);
              return; // Exit if indices not found
          }
          const cellData = matrix[sdgIndex][courseIndex];
          // --- End index finding ---

          // Highlight SDG label
          const sdgNumber = cellData.sdg; // Use sdgNumber from cellData
          const sdgColor = sdgColors[sdgNumber];
          d3.select(`.sdg-label[data-sdg="${sdgNumber}"]`) // Target single label
            .attr('fill', sdgColor);

          // Highlight course label
          // const courseIndex = j; // Use the calculated courseIndex from above
          xAxisGroup.selectAll('text')
            .filter((_, idx) => idx === courseIndex) // Use correct courseIndex
            .style('fill', 'var(--primary-color)')
            .style('font-weight', 'bold');

          // Tooltip content
          let tooltipContent = `<b>Course: ${cellData.course}</b><br>`;
          tooltipContent += `<b>SDG ${cellData.sdg}: ${cellData.sdg_name}</b><br>`;
          tooltipContent += `Present: ${cellData.addressed ? 'Yes' : 'Not detected'}<br>`;
          if (cellData.addressed && cellData.target_number && cellData.target_name) {
            tooltipContent += `Target: ${cellData.target_number} - ${cellData.target_name}<br>`;
          }
          if (cellData.addressed && cellData.justification) {
             tooltipContent += `Justification:<br>${cellData.justification.substring(0, 100)}${cellData.justification.length > 100 ? '...' : ''}`;
          }
          tooltip.html(tooltipContent).style('visibility', 'visible');
      })
      .on('mousemove', function(event) {
          tooltip.style('top', (event.pageY - 10) + 'px')
                  .style('left', (event.pageX + 10) + 'px');
      })
      .on('mouseout', function(event) {
          // Get data from attributes again for mouseout
          const rect = d3.select(this);
          const sdg = parseInt(rect.attr('data-sdg'));
          const course = rect.attr('data-course');

          // Find indices
          const sdgIndex = sdgNumbers.indexOf(sdg);
          const courseIndex = courses.indexOf(course);

          if (sdgIndex < 0 || courseIndex < 0) {
              // Don't need to warn again on mouseout
              return; // Exit if indices not found
          }
          // const cellData = matrix[sdgIndex][courseIndex]; // Not strictly needed for mouseout styling reset
          // --- End index finding ---

          // Reset SDG label color
          const sdgNumber = sdg; // Use sdg directly
          d3.select(`.sdg-label[data-sdg="${sdgNumber}"]`) // Target single label
            .attr('fill', themeTextColor);

          // Reset course label color
          // const courseIndex = j; // Use the calculated courseIndex from above
           xAxisGroup.selectAll('text')
             .filter((_, idx) => idx === courseIndex) // Use correct courseIndex
             .style('fill', themeGridTextColor) // Use theme grid text color
             .style('font-weight', 'normal');

          tooltip.style('visibility', 'hidden');
      });
  }

  // Store cumulative values for radar chart if needed
  if (isCumulative) {
    finalCumulativeValues = sdgNumbers.map(sdg => {
      const sdgIndex = sdgNumbers.indexOf(sdg);
      const lastCourseIndex = courses.length - 1;
      return lastCourseIndex >= 0 ? matrix[sdgIndex][lastCourseIndex].value : 0;
    });
  }
}
