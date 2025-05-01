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
  const margin = { top: 20, right: 50, bottom: 150, left: 250 }; // Increased left margin to accommodate text and icons
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
        .attr('data-value', cell.value)
        .attr('class', `sdg-cell sdg-${cell.sdg}`)
        .on('mouseover', function() {
          const sdgNumber = d3.select(this).attr('data-sdg');
          const sdgColor = sdgColors[sdgNumber];
          
          // Change text color for this SDG row
          d3.selectAll(`.sdg-label[data-sdg="${sdgNumber}"], .sdg-label-second-line[data-sdg="${sdgNumber}"]`)
            .attr('fill', sdgColor);
        })
        .on('mouseout', function() {
          const sdgNumber = d3.select(this).attr('data-sdg');
          
          // Reset text color
          d3.selectAll(`.sdg-label[data-sdg="${sdgNumber}"], .sdg-label-second-line[data-sdg="${sdgNumber}"]`)
            .attr('fill', 'black');
        });
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

  // Add y-axis with SDG icons instead of text
  const yAxis = svg.append('g')
    .call(d3.axisLeft(yScale)
      .tickFormat(() => '')  // Remove default text labels
      .tickSize(0));
  
  // Remove the y-axis line
  svg.selectAll('.domain').remove();
  
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

  // Add SDG icons and text labels with click functionality
  const ticks = yAxis.selectAll('.tick');
  
  // Add hover effects for each row
  ticks.on('mouseover', function(event, d) {
    const sdgIndex = d;
    const sdgNumber = sdgNumbers[sdgIndex];
    const sdgColor = sdgColors[sdgNumber];
    
    // Change text color on hover
    d3.select(this).selectAll('.sdg-label, .sdg-label-second-line')
      .attr('fill', sdgColor);
  })
  .on('mouseout', function() {
    // Reset text color on mouseout
    d3.select(this).selectAll('.sdg-label, .sdg-label-second-line')
      .attr('fill', 'black');
  });
  
  // Add text labels
  ticks.append('text')
    .attr('x', -45)  // Position text to the left of the icon
    .attr('y', 0)
    .attr('text-anchor', 'end')
    .attr('dominant-baseline', 'middle')
    .attr('fill', 'black')  // Default color is black
    .attr('font-size', '12px')
    .attr('font-weight', 'bold')
    .attr('cursor', 'pointer')
    .attr('class', 'sdg-label')
    .attr('data-sdg', (d, i) => sdgNumbers[i])  // Store SDG number for hover effects
    .text((d, i) => {
      const sdgName = constants.sdgNames[sdgNumbers[i]];
      // Split into two lines if name is long
      if (sdgName.length > 15) {
        const words = sdgName.split(' ');
        const midpoint = Math.floor(words.length / 2);
        const firstLine = words.slice(0, midpoint).join(' ');
        return firstLine;
      }
      return sdgName;
    })
    .on('click', function(event, d) {
      const sdgNumber = d3.select(this.parentNode).select('image').attr('data-sdg');
      // Update currentSDG
      currentSDG = parseInt(sdgNumber);
      
      // Remove active class from all SDG icons in sidebar
      document.querySelectorAll('#sdgIconsList .sdg-icon-item').forEach(el => el.classList.remove('active'));
      
      // Add active class to the corresponding SDG icon in sidebar
      const sidebarIcon = document.querySelector(`#sdgIconsList .sdg-icon-item[data-sdg="${sdgNumber}"]`);
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
  
  // Add second line of text for long names
  ticks.append('text')
    .attr('x', -45)  // Position text to the left of the icon
    .attr('y', 15)  // Position below the first line
    .attr('text-anchor', 'end')
    .attr('dominant-baseline', 'middle')
    .attr('fill', 'black')  // Default color is black
    .attr('font-size', '12px')
    .attr('font-weight', 'bold')
    .attr('cursor', 'pointer')
    .attr('class', 'sdg-label-second-line')
    .attr('data-sdg', (d, i) => sdgNumbers[i])  // Store SDG number for hover effects
    .text((d, i) => {
      const sdgName = constants.sdgNames[sdgNumbers[i]];
      // Only add second line if name is long
      if (sdgName.length > 15) {
        const words = sdgName.split(' ');
        const midpoint = Math.floor(words.length / 2);
        const secondLine = words.slice(midpoint).join(' ');
        return secondLine;
      }
      return '';
    })
    .on('click', function(event, d) {
      const sdgNumber = d3.select(this.parentNode).select('image').attr('data-sdg');
      // Update currentSDG
      currentSDG = parseInt(sdgNumber);
      
      // Remove active class from all SDG icons in sidebar
      document.querySelectorAll('#sdgIconsList .sdg-icon-item').forEach(el => el.classList.remove('active'));
      
      // Add active class to the corresponding SDG icon in sidebar
      const sidebarIcon = document.querySelector(`#sdgIconsList .sdg-icon-item[data-sdg="${sdgNumber}"]`);
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
  
  // Add SDG icons
  ticks.append('image')
    .attr('xlink:href', (d, i) => `logo/E Inverted Icons_WEB-${(sdgNumbers[i] < 10 ? '0' : '') + sdgNumbers[i]}.png`)
    .attr('x', -40)  // Position the icon to the left of the axis
    .attr('y', -20)  // Center the icon vertically
    .attr('width', 40)
    .attr('height', 40)
    .attr('cursor', 'pointer')  // Change cursor to indicate clickable
    .attr('data-sdg', (d, i) => sdgNumbers[i])  // Store SDG number as data attribute
    .on('click', function(event, d) {
      const sdgNumber = d3.select(this).attr('data-sdg');
      // Update currentSDG
      currentSDG = parseInt(sdgNumber);
      
      // Remove active class from all SDG icons in sidebar
      document.querySelectorAll('#sdgIconsList .sdg-icon-item').forEach(el => el.classList.remove('active'));
      
      // Add active class to the corresponding SDG icon in sidebar
      const sidebarIcon = document.querySelector(`#sdgIconsList .sdg-icon-item[data-sdg="${sdgNumber}"]`);
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
    // We've already added mouseover/mouseout events to the cells for the SDG label color change
    // Now we'll extend those event handlers to also show tooltips
    svg.selectAll('rect')
      .each(function() {
        const rect = d3.select(this);
        
        // Get the original mouseover handler
        const originalMouseover = rect.on('mouseover');
        
        // Replace with a new handler that calls the original and adds tooltip functionality
        rect.on('mouseover', function(event, d) {
          // Call the original handler to change text color
          if (originalMouseover) originalMouseover.call(this, event, d);
          
          // Add tooltip functionality
          const i = Math.floor(d3.select(this).attr('y') / yScale.bandwidth());
          const j = Math.floor(d3.select(this).attr('x') / xScale.bandwidth());
          const cell = matrix[i][j];
          
          // Highlight the course name in the x-axis
          svg.selectAll('.tick text')
            .filter(function(d, idx) { return idx === j; })
            .style('fill', 'var(--primary-color)')
            .style('font-weight', 'bold');
          
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
        });
        
        // Add mousemove handler for tooltip positioning
        rect.on('mousemove', function(event) {
          tooltip.style('top', (event.pageY - 10) + 'px')
                 .style('left', (event.pageX + 10) + 'px');
        });
        
        // Get the original mouseout handler
        const originalMouseout = rect.on('mouseout');
        
        // Replace with a new handler that calls the original and hides tooltip
        rect.on('mouseout', function(event, d) {
          // Call the original handler to reset text color
          if (originalMouseout) originalMouseout.call(this, event, d);
          
          // Reset course name color in the x-axis
          const j = Math.floor(d3.select(this).attr('x') / xScale.bandwidth());
          svg.selectAll('.tick text')
            .filter(function(d, idx) { return idx === j; })
            .style('fill', 'black')
            .style('font-weight', 'normal');
          
          // Hide tooltip
          tooltip.style('visibility', 'hidden');
        });
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
