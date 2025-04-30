let finalCumulativeValues = [];

function createHeatmap(data, isCumulative) {
  // Clear previous plot
  d3.select('#plot-container').html('');

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
          // Include target information if available
          target_number: '',
          target_name: ''
        });
      }
    } else {
      for (let j = 0; j < courses.length; j++) {
        const course = courses[j];
        const value = courseSDGs[course][sdg];
        const justification = courseJustifications[course]?.[sdg] || '';
        
        // Find original row for target information
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

  // Calculate dimensions
  const margin = { top: 20, right: 50, bottom: 150, left: 450 }; // Increased left margin for SDG labels
  const width = document.getElementById('plot-container').offsetWidth - margin.left - margin.right;
  const height = document.getElementById('plot-container').offsetHeight - margin.top - margin.bottom;

  // Create SVG
  const svg = d3.select('#plot-container')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
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

  // Define color scale - using theme colors for more pronounced appearance
  const colorScale = d3.scaleOrdinal()
    .domain([0, 1])
    .range(['#f8f9fa', 'var(--primary-color)']); // Use primary theme color for addressed SDGs

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
          if (cell.value === 0) return '#f8f9fa';
          if (isCumulative) {
            // For cumulative view, create a gradient based on value
            const intensity = cell.value / (courses.length * 0.5); // Normalize
            return `rgba(0, 123, 255, ${Math.min(0.3 + intensity * 0.7, 1)})`; // Primary color with opacity
          } else {
            return 'var(--primary-color)'; // Full color for binary view
          }
        })
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
        .attr('data-sdg', cell.sdg)
        .attr('data-course', cell.course)
        .attr('data-value', cell.value);
    }
  }

  // Add x-axis with vertical labels
  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(xScale)
      .tickFormat(i => courses[i])
      .tickSize(0))
    .selectAll('text')
    .attr('transform', 'rotate(90)')
    .style('text-anchor', 'start')
    .attr('dx', '0.8em')
    .attr('dy', '-0.15em')
    .style('font-size', '16px');
  
  // Remove the x-axis line
  svg.select('.domain').remove();

  // Add y-axis
  svg.append('g')
    .call(d3.axisLeft(yScale)
      .tickFormat(i => `SDG ${sdgNumbers[i]} - ${constants.sdgNames[sdgNumbers[i]]}`)
      .tickSize(0))
    .selectAll('text')
    .style('font-size', '16px');
  
  // Remove the y-axis line
  svg.selectAll('.domain').remove();

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

  // Add tooltip interaction - only for non-cumulative heatmap
  if (!isCumulative) {
    svg.selectAll('rect')
      .on('mouseover', function(event, d) {
        const i = Math.floor(d3.select(this).attr('y') / yScale.bandwidth());
        const j = Math.floor(d3.select(this).attr('x') / xScale.bandwidth());
        const cell = matrix[i][j];
        
        let tooltipContent = `<b>Course: ${cell.course}</b><br>`;
        tooltipContent += `<b>SDG ${cell.sdg}: ${cell.sdg_name}</b><br>`;
        tooltipContent += `Present: ${cell.addressed ? 'Yes' : 'No'}<br>`;
        
        // Only add target info if it exists and the SDG is addressed
        if (cell.addressed && cell.target_number && cell.target_name) {
          tooltipContent += `Target: ${cell.target_number} - ${cell.target_name}<br>`;
        }
        
        // Only add justification if it exists and the SDG is addressed
        if (cell.addressed && cell.justification) {
          // Format justification text to fit better in tooltip
          let justification = cell.justification;
          if (justification.length > 0) {
            const words = justification.split(' ');
            let currentLine = '';
            let formattedJustification = '';
            const wordsPerLine = 10; // Adjusted for potentially better wrapping

            for (let i = 0; i < words.length; i++) {
              currentLine += words[i] + ' ';
              if ((i + 1) % wordsPerLine === 0 || i === words.length - 1) {
                formattedJustification += currentLine.trim() + '<br>';
                currentLine = '';
              }
            }
            // Keep original justification or formatted, but avoid trailing <br>
            justification = formattedJustification.trim();
          }
          
          tooltipContent += `Justification:<br>${justification}`;
        }
        
        tooltip.html(tooltipContent)
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

  // Store cumulative values for radar chart if needed
  if (isCumulative) {
    finalCumulativeValues = sdgNumbers.map(sdg => {
      const sdgIndex = sdgNumbers.indexOf(sdg);
      const lastCourseIndex = courses.length - 1;
      return lastCourseIndex >= 0 ? matrix[sdgIndex][lastCourseIndex].value : 0;
    });
  }
}
