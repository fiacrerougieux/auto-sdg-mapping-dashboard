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

  // Filter out SDG 4
  const sdgNumbers = Array.from({ length: 17 }, (_, i) => i + 1).filter(sdg => sdg !== 4);

  // Create matrix data - only for filtered SDGs
  const matrix = [];
  sdgNumbers.forEach(sdg => { // Iterate over filtered SDGs
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
    matrix.push(row); // Matrix will only have rows for filtered SDGs
  });

  // --- Responsive Layout Logic ---
  const mobileBreakpoint = 768;
  const isMobile = window.innerWidth <= mobileBreakpoint;

  // --- Define variables needed in both layouts ---
  let margin, width, height, plotWidth, plotHeight, totalSvgWidth, totalSvgHeight;
  const cellPadding = 0.01;
  const mobileCellSize = 20; // Fixed cell size for mobile vertical layout
  const mobileLeftMargin = 100; // Margin for course labels on mobile
  const mobileTopMargin = 150; // Margin for SDG labels on mobile
  let xScale, yScale, xAxisGroup, yAxisGroup; // Declare scales and axes groups

  // --- Determine theme colors (needed early) ---
  const isDarkTheme = document.body.classList.contains('dark-theme');
  const themeTextColor = isDarkTheme ? '#00e8ff' : 'black';
  const themeBgColor = isDarkTheme ? '#0a0e17' : '#ffffff';
  const themeGridTextColor = isDarkTheme ? '#88a0cc' : '#666';
  const themeCellStrokeColor = isDarkTheme ? '#0a0e17' : '#fff';
  const themeEmptyCellColor = isDarkTheme ? '#121a29' : '#f8f9fa';

  // Define SDG colors (used for hover/click on labels - needed in both layouts)
  const sdgColors = {
    1: "#E5243B", 2: "#DDA63A", 3: "#4C9F38", 4: "#C5192D", 5: "#FF3A21",
    6: "#26BDE2", 7: "#FCC30B", 8: "#A21942", 9: "#FD6925", 10: "#DD1367",
    11: "#FD9D24", 12: "#BF8B2E", 13: "#3F7E44", 14: "#0A97D9", 15: "#56C02B",
    16: "#00689D", 17: "#19486A"
  };

  // --- Start Layout Specific Drawing ---
  let svg; // Declare svg variable outside the if/else

  if (isMobile) {
    // --- Vertical Layout (Mobile) ---
    console.log("Drawing mobile heatmap layout");
    margin = { top: mobileTopMargin, right: 20, bottom: 20, left: mobileLeftMargin };
    plotWidth = sdgNumbers.length * mobileCellSize; // Width based on SDGs
    plotHeight = courses.length * mobileCellSize; // Height based on Courses
    totalSvgWidth = plotWidth + margin.left + margin.right;
    totalSvgHeight = plotHeight + margin.top + margin.bottom;

    // Create SVG - width determined by content, height by container initially
    const svgElement = d3.select(`#${targetDivId}`)
      .append('svg')
      .attr('width', totalSvgWidth) // Set calculated width
      .attr('height', plotContainer.offsetHeight); // Use container height for initial view

    // Add background
    svgElement.append('rect')
        .attr('x', 0).attr('y', 0)
        .attr('width', totalSvgWidth).attr('height', totalSvgHeight) // Cover calculated size
        .attr('fill', themeBgColor);

    // Create main group
    svg = svgElement.append('g') // Assign to the outer svg variable
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Define scales (x=SDGs, y=Courses)
    xScale = d3.scaleBand()
      .domain(d3.range(sdgNumbers.length)) // Use indices of filtered SDGs
      .range([0, plotWidth])
      .padding(cellPadding);

    yScale = d3.scaleBand()
      .domain(courses.map((_, i) => i)) // Courses along Y
      .range([0, plotHeight])
      .padding(cellPadding);

    // Create heatmap cells (x=sdgIndex, y=courseIndex)
    for (let i = 0; i < matrix.length; i++) { // i = sdgIndex
      const row = matrix[i];
      for (let j = 0; j < row.length; j++) { // j = courseIndex
        const cell = row[j];
        svg.append('rect')
          .attr('x', xScale(i)) // x based on SDG index
          .attr('y', yScale(j)) // y based on Course index
          .attr('width', xScale.bandwidth())
          .attr('height', yScale.bandwidth())
          .attr('fill', function() {
            if (cell.value === 0) return themeEmptyCellColor;
            if (isCumulative) {
              const intensity = cell.value / (courses.length * 0.5);
              return `rgba(0, 123, 255, ${Math.min(0.3 + intensity * 0.7, 1)})`;
            } else {
              return isDarkTheme ? themeTextColor : 'var(--primary-color)';
            }
          })
          .attr('stroke', themeCellStrokeColor)
          .attr('stroke-width', 1)
          .attr('data-sdg', cell.sdg)
          .attr('data-course', cell.course)
          .attr('data-value', cell.value)
          .attr('class', `sdg-cell sdg-${cell.sdg}`);
      }
    }

    // Add x-axis (SDGs at top)
    xAxisGroup = svg.append('g')
      .call(d3.axisTop(xScale) // Use axisTop
        .tickFormat((d, i) => sdgNumbers[i]) // Show filtered SDG numbers
        .tickSize(0));

    xAxisGroup.selectAll('text')
      .attr('transform', 'rotate(-90)') // Rotate labels
      .style('text-anchor', 'end')
      .attr('dx', '-0.8em')
      .attr('dy', '-0.15em')
      .style('font-size', '10px') // Smaller font
      .style('fill', themeGridTextColor);

    xAxisGroup.select('.domain').remove();

    // Add y-axis (Courses on left)
    yAxisGroup = svg.append('g')
      .call(d3.axisLeft(yScale) // Use axisLeft
        .tickFormat((d, i) => courses[i]) // Show course codes
        .tickSize(0));

    yAxisGroup.selectAll('text')
      .style('text-anchor', 'end')
      .style('font-size', '10px') // Smaller font
      .style('fill', themeGridTextColor);

    yAxisGroup.select('.domain').remove();

  } else {
    // --- Horizontal Layout (Desktop) ---
    console.log("Drawing desktop heatmap layout");
    const verticalPadding = 50; // Padding for bubble overflow
    margin = { top: 20, right: 50, bottom: 150, left: 350 };
    plotWidth = plotContainer.offsetWidth - margin.left - margin.right;

    // Calculate minimum required height based on filtered SDGs
    const minPixelsPerSdg = 25; // Minimum vertical space per SDG label row
    const requiredPlotHeight = sdgNumbers.length * minPixelsPerSdg; // Use filtered length

    // Use the larger of container-derived height or required height
    const containerDerivedHeight = Math.max(10, plotContainer.offsetHeight - margin.top - margin.bottom - (2 * verticalPadding));
    plotHeight = Math.max(containerDerivedHeight, requiredPlotHeight);

    // Calculate total SVG height based on the determined plotHeight
    totalSvgWidth = plotWidth + margin.left + margin.right;
    totalSvgHeight = plotHeight + margin.top + margin.bottom + (2 * verticalPadding); // Use calculated plotHeight

    // Create SVG
    const svgElement = d3.select(`#${targetDivId}`)
      .append('svg')
      .attr('width', totalSvgWidth)
      .attr('height', totalSvgHeight);

    // Add background
    svgElement.append('rect')
        .attr('x', 0).attr('y', 0)
        .attr('width', totalSvgWidth).attr('height', totalSvgHeight)
        .attr('fill', themeBgColor);

    // Create main group
    svg = svgElement.append('g') // Assign to the outer svg variable
      .attr('transform', `translate(${margin.left}, ${margin.top + verticalPadding})`);

    // Define scales (x=Courses, y=SDGs)
    xScale = d3.scaleBand()
      .domain(courses.map((_, i) => i)) // Courses along X
      .range([0, plotWidth])
      .padding(cellPadding);

    yScale = d3.scaleBand()
      .domain(d3.range(sdgNumbers.length)) // Use indices of filtered SDGs
      .range([0, plotHeight])
      .padding(cellPadding);

    // Create heatmap cells (x=courseIndex, y=sdgIndex)
    // Iterate using filtered sdgNumbers length for the outer loop (matrix rows)
    for (let i = 0; i < sdgNumbers.length; i++) { // i = filtered sdgIndex
      const row = matrix[i]; // Get the correct row from the filtered matrix
      for (let j = 0; j < row.length; j++) { // j = courseIndex
        const cell = row[j];
        svg.append('rect')
          .attr('x', xScale(j)) // x based on Course index
          .attr('y', yScale(i)) // y based on filtered SDG index
          .attr('width', xScale.bandwidth())
          .attr('height', yScale.bandwidth())
          .attr('fill', function() {
            if (cell.value === 0) return themeEmptyCellColor;
            if (isCumulative) {
              const intensity = cell.value / (courses.length * 0.5);
              return `rgba(0, 123, 255, ${Math.min(0.3 + intensity * 0.7, 1)})`;
            } else {
              return isDarkTheme ? themeTextColor : 'var(--primary-color)';
            }
          })
          .attr('stroke', themeCellStrokeColor)
          .attr('stroke-width', 1)
          .attr('data-sdg', cell.sdg)
          .attr('data-course', cell.course)
          .attr('data-value', cell.value)
          .attr('class', `sdg-cell sdg-${cell.sdg}`);
      }
    }

    // Add x-axis (Courses at bottom)
    xAxisGroup = svg.append('g')
      .attr('transform', `translate(0,${plotHeight})`)
      .call(d3.axisBottom(xScale)
        .tickFormat((d, i) => courses[i])
        .tickSize(0));

    xAxisGroup.selectAll('text')
      .attr('transform', 'rotate(90)')
      .style('text-anchor', 'start')
      .attr('dx', '0.8em')
      .attr('dy', '-0.15em')
      .style('font-size', '12px')
      .style('fill', themeGridTextColor);

    xAxisGroup.select('.domain').remove();

    // Add y-axis (SDGs on left)
    yAxisGroup = svg.append('g')
      .call(d3.axisLeft(yScale)
        .tickFormat(() => '') // No ticks needed, labels added manually
        .tickSize(0));

    yAxisGroup.select('.domain').remove();

    // Add SDG text labels manually for horizontal layout
    const ticks = yAxisGroup.selectAll('.tick') // Select existing ticks (even if empty)
      .data(d3.range(sdgNumbers.length)) // Bind indices of filtered SDGs
      .join('g') // Join data
      .attr('class', 'tick') // Add tick class if needed
      .attr('transform', (d, i) => `translate(0, ${yScale(i) + yScale.bandwidth() / 2})`); // Position based on filtered scale

    // Add hover effects for each row (tick group)
    ticks.on('mouseover', function(event, d) {
      const sdgIndex = d; // The filtered index passed by d3
      const sdgNumber = sdgNumbers[sdgIndex]; // Get the actual SDG number
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
      .attr('data-sdg', (d, i) => sdgNumbers[i]) // Store the actual SDG number
      .text((d, i) => `SDG ${sdgNumbers[i]}${constants.sdgNames[sdgNumbers[i]] ? ': ' + constants.sdgNames[sdgNumbers[i]] : ''}`) // Display SDG number and name for filtered SDG
      .on('click', function(event, d) {
         const sdgNumber = sdgNumbers[d]; // Get the actual SDG number using the filtered index
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
  } // End of layout specific drawing

  // --- Common Logic (Tooltips, etc.) ---

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

          // Find indices based on current layout
          let sdgIndex, courseIndex;
          // Find indices based on filtered sdgNumbers
          sdgIndex = sdgNumbers.indexOf(sdg); // Use filtered list
          courseIndex = courses.indexOf(course);

          if (sdgIndex < 0 || courseIndex < 0) { // sdgIndex will be -1 if SDG 4 is hovered (it shouldn't be possible)
              console.warn("Could not find indices for tooltip", sdg, course);
              return; // Exit if indices not found
          }
          const cellData = matrix[sdgIndex][courseIndex]; // Access matrix correctly

          // Highlight SDG label (handle both layouts)
          const sdgNumber = cellData.sdg; // Actual SDG number (e.g., 3, 5)
          const sdgColor = sdgColors[sdgNumber];
          if (isMobile) {
              xAxisGroup.selectAll('text') // SDGs are on X axis in mobile
                .filter((d, i) => i === sdgIndex) // Filter based on filtered index
                .style('fill', sdgColor)
                .style('font-weight', 'bold');
          } else {
              d3.select(`.sdg-label[data-sdg="${sdgNumber}"]`) // Select label by actual SDG number
                .attr('fill', sdgColor);
          }

          // Highlight course label (handle both layouts)
          if (isMobile) {
              yAxisGroup.selectAll('text') // Courses are on Y axis in mobile
                .filter((_, idx) => idx === courseIndex)
                .style('fill', 'var(--primary-color)')
                .style('font-weight', 'bold');
          } else {
              xAxisGroup.selectAll('text') // Courses are on X axis in desktop
                .filter((_, idx) => idx === courseIndex)
                .style('fill', 'var(--primary-color)')
                .style('font-weight', 'bold');
          }

          // Tooltip content
          let tooltipContent = `<b>Course: ${cellData.course}</b><br>`;
          tooltipContent += `<b>SDG ${cellData.sdg}: ${cellData.sdg_name}</b><br>`;
          tooltipContent += `Present: ${cellData.addressed ? 'Yes' : 'Not detected when analysing public data for this course. N.B. more granular data may reveal that this SDG may be present.'}<br>`;
          if (cellData.addressed && cellData.target_number && cellData.target_name) {
            tooltipContent += `Target: ${cellData.target_number} - ${cellData.target_name}<br>`;
          }
          if (cellData.addressed && cellData.justification) {
             tooltipContent += `Justification:<br>${cellData.justification}`;
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

          // Find indices based on current layout
          let sdgIndex, courseIndex;
          // Find indices based on filtered sdgNumbers
          sdgIndex = sdgNumbers.indexOf(sdg); // Use filtered list
          courseIndex = courses.indexOf(course);

          if (sdgIndex < 0 || courseIndex < 0) { // sdgIndex will be -1 if SDG 4 is hovered
              return; // Exit if indices not found
          }

          // Reset SDG label color
          const sdgNumber = sdg; // Actual SDG number
          if (isMobile) {
              xAxisGroup.selectAll('text')
                .filter((d, i) => i === sdgIndex) // Filter based on filtered index
                .style('fill', themeGridTextColor)
                .style('font-weight', 'normal');
          } else {
              d3.select(`.sdg-label[data-sdg="${sdgNumber}"]`) // Select label by actual SDG number
                .attr('fill', themeTextColor);
          }

          // Reset course label color
          if (isMobile) {
              yAxisGroup.selectAll('text')
                .filter((_, idx) => idx === courseIndex)
                .style('fill', themeGridTextColor)
                .style('font-weight', 'normal');
          } else {
              xAxisGroup.selectAll('text')
                .filter((_, idx) => idx === courseIndex)
                .style('fill', themeGridTextColor)
                .style('font-weight', 'normal');
          }

          tooltip.style('visibility', 'hidden');
      });
  }

  // Store cumulative values for radar chart if needed - use filtered sdgNumbers
  if (isCumulative) {
    finalCumulativeValues = sdgNumbers.map((sdg, filteredIndex) => { // Iterate over filtered SDGs
      const lastCourseIndex = courses.length - 1;
      // Ensure matrix access is valid using the filteredIndex
      if (filteredIndex >= 0 && lastCourseIndex >= 0 && matrix[filteredIndex] && matrix[filteredIndex][lastCourseIndex]) {
        return matrix[filteredIndex][lastCourseIndex].value;
      }
      return 0; // Return 0 if indices are invalid
    });
  }
}
