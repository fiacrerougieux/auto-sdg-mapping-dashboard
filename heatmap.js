let finalCumulativeValues = [];
function createHeatmap(data, isCumulative) {
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
  const matrix = sdgNumbers.map(sdg => {
    if (isCumulative) {
      let sum = 0;
      return courses.map(course => {
        sum += courseSDGs[course][sdg];
        return sum;
      });
    } else {
      return courses.map(course => courseSDGs[course][sdg]);
    }
  });

  const dimensions = getPlotDimensions();
  const layout = {
    xaxis: {
      ticktext: courses,
      tickvals: courses.map((_, i) => i),
      tickangle: 45,
      tickfont: { size: 16 },
      automargin: true
    },
    yaxis: {
      ticktext: sdgNumbers.map(num => `SDG ${num} - ${constants.sdgNames[num]}`),
      tickvals: sdgNumbers.map((_, i) => i),
      tickfont: { size: 16 },
      automargin: true
    },
    margin: { l: 250, r: 50, b: 150, t: 20 },
    width: dimensions.width,
    height: dimensions.height
  };

  // Create customdata for hovertemplate
  const customData = sdgNumbers.map(sdg => {
    return courses.map(course => {
      const value = courseSDGs[course][sdg];
      let justification = courseJustifications[course]?.[sdg] || '';

      // Format justification text to fit better in tooltip
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
        justification = formattedJustification.slice(0, -4); // Remove trailing '<br>'
      }

      const customDataItem = {
        course_code: course,
        sdg_number: sdg,
        sdg_name: constants.sdgNames[sdg],
        addressed: value ? 'Yes' : 'No',
        justification: justification
      };

      // Include target information if available in the original data row
      const originalRow = data.find(row => row.course_code === course && row.sdg_number === sdg);
      if (originalRow && originalRow.target_number !== undefined) {
        customDataItem.target_number = originalRow.target_number;
      }
      if (originalRow && originalRow.target_name !== undefined) {
        customDataItem.target_name = originalRow.target_name;
      }

      return customDataItem;
    });
  });

  // Dynamically construct hovertemplate based on available data
  let hoverTemplateString = 'Course: %{customdata.course_code}<br>SDG %{customdata.sdg_number}: %{customdata.sdg_name}<br>Present: %{customdata.addressed}<br>';


  // Content to show if addressed is 'Yes'
  let detailsIfPresent = '';
  // Check if target information exists (use customdata for per-point check)
  // Note: Plotly hovertemplate conditionals might not directly access nested properties like target_number easily within the condition itself.
  // We rely on the customdata structure; if target_* exists, it will be shown. If not, Plotly handles missing properties gracefully.
  detailsIfPresent += 'Target: %{customdata.target_number} - %{customdata.target_name}<br>'; // Assume target_* might be undefined/null if not present
  detailsIfPresent += 'Justification:<br>%{customdata.justification}';

  hoverTemplateString += detailsIfPresent;


  hoverTemplateString += '<extra></extra>'; // Add Plotly extra tag


  const plotData = [{
    z: matrix,
    type: 'heatmap',
    colorscale: 'YlOrRd',
    reversescale: true,
    hoverongaps: false,
    hoverinfo: 'skip', // Skip default hoverinfo
    customdata: customData,
    hovertemplate: hoverTemplateString,
    hoverlabel: {
      namelength: -1,
      bgcolor: 'white',
      bordercolor: '#888',
      font: {color: 'black', size: 14},
      align: 'left',
      width: 800  // Increase the width of the tooltip to accommodate more text
    }
  }];

  Plotly.newPlot('plot-container', plotData, layout);

  if (isCumulative) {
    finalCumulativeValues = sdgNumbers.map(sdg =>
      matrix[sdgNumbers.indexOf(sdg)][courses.length - 1] || 0
    );
  }
}
