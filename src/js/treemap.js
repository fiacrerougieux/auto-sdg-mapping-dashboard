function createTreemap(data, courseNameData, selectedSDG = 1) {
  console.log('Creating treemap with data:', data ? data.length : 'no data', 'courseNameData:', courseNameData ? Object.keys(courseNameData).length : 'no courseNameData', 'SDG:', selectedSDG);
  
  const treemapDiv = document.getElementById('treemap-div');
  if (!treemapDiv) {
    console.error('Treemap div not found');
    return;
  }
  
  treemapDiv.innerHTML = ''; // Clear previous content

  const width = treemapDiv.clientWidth || 800;
  const height = treemapDiv.clientHeight || 600;

  console.log('Treemap dimensions:', width, 'x', height);

  // Ensure we have minimum dimensions
  if (width < 100 || height < 100) {
    console.warn('Treemap dimensions too small, using defaults');
    // Show a message instead of returning
    treemapDiv.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">Treemap area too small. Please resize the window.</div>';
    return;
  }

  const svg = d3.select(treemapDiv).append("svg")
      .attr("width", width)
      .attr("height", height);

  // Get constants from global variable with fallback
  const globalConstants = window.constants || {};
  
  // If constants are not loaded, create minimal fallback
  if (!globalConstants.facultyMapping || !globalConstants.specializationNames) {
    console.warn('Constants not loaded properly, using fallback');
    
    // Show loading message or create sample data
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height / 2 - 20)
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .attr("fill", "#666")
      .text("Loading treemap data...");
      
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height / 2 + 10)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("fill", "#999")
      .text("Please ensure data files are loaded properly");
    return;
  }

  // Check if we have data
  if (!data || data.length === 0) {
    console.warn('No data provided to treemap');
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .attr("fill", "#666")
      .text("No data available for treemap");
    return;
  }

  // 1. Process data for treemap
  const coursesForSDG = data.filter(d => 
    d.sdg_number === selectedSDG && 
    (d.addressed === true || d.addressed === 'yes' || d.addressed === 'Yes' || d.addressed === 'YES')
  );
  
  if (coursesForSDG.length === 0) {
    // Display message when no data available
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .attr("fill", "#666")
      .text(`No courses found addressing SDG ${selectedSDG}`);
    return;
  }

  const uniqueCourses = [...new Set(coursesForSDG.map(d => d.course_code))];

  let hierarchy = {
    name: "University",
    children: []
  };

  const facultyMap = new Map();

  uniqueCourses.forEach(courseCode => {
    const discipline = courseCode.substring(0, 4);
    const facultyCode = globalConstants.facultyMapping[discipline] || "Other";
    const facultyName = globalConstants.facultyNames[facultyCode] || facultyCode;
    const specializationName = globalConstants.specializationNames[discipline] || discipline;

    if (!facultyMap.has(facultyCode)) {
      facultyMap.set(facultyCode, { name: facultyName, code: facultyCode, children: new Map() });
    }
    const facultyNode = facultyMap.get(facultyCode);

    if (!facultyNode.children.has(specializationName)) {
      facultyNode.children.set(specializationName, { 
        name: specializationName, 
        value: 0,
        courses: [],
        id: discipline
      });
    }
    const specializationNode = facultyNode.children.get(specializationName);
    specializationNode.value += 1;
    specializationNode.courses.push(courseCode);
  });

  // Convert maps to arrays for D3 hierarchy
  facultyMap.forEach(facultyNode => {
    const faculty = { name: facultyNode.name, code: facultyNode.code, children: [] };
    facultyNode.children.forEach(specNode => {
      faculty.children.push(specNode);
    });
    hierarchy.children.push(faculty);
  });

  // 2. Create treemap layout
  const root = d3.hierarchy(hierarchy).sum(d => d.value || 0);

  d3.treemap()
    .size([width, height])
    .padding(2)
    .paddingOuter(4)
    (root);

  // 3. Render the treemap
  const facultyColors = constants.facultyColors || {};
  const color = d3.scaleOrdinal(Object.values(facultyColors)).domain(Object.keys(facultyColors));

  const nodes = svg.selectAll("g")
    .data(root.leaves())
    .enter().append("g")
      .attr("transform", d => `translate(${d.x0},${d.y0})`);

  nodes.append("rect")
    .attr("width", d => Math.max(0, d.x1 - d.x0))
    .attr("height", d => Math.max(0, d.y1 - d.y0))
    .attr("fill", d => color(d.parent.data.code) || '#999999')
    .attr("stroke", "#fff")
    .attr("stroke-width", 1)
    .style("cursor", "pointer");

  // Improved text handling
  nodes.each(function(d) {
    const node = d3.select(this);
    const rectWidth = d.x1 - d.x0;
    const rectHeight = d.y1 - d.y0;
    
    // Only add text if rectangle is large enough
    if (rectWidth > 30 && rectHeight > 20) {
      const text = node.append("text")
        .attr("x", 4)
        .attr("y", 16)
        .attr("font-size", "12px")
        .attr("font-weight", "bold")
        .attr("fill", "white")
        .style("text-shadow", "1px 1px 1px rgba(0,0,0,0.5)");

      // Split text into words and add as tspans
      const words = d.data.name.split(/\s+/);
      let line = [];
      let lineNumber = 0;
      const lineHeight = 14;
      const maxLines = Math.floor((rectHeight - 8) / lineHeight);

      words.forEach(word => {
        line.push(word);
        const testLine = line.join(' ');
        
        // Create temporary tspan to measure text width
        const tempTspan = text.append("tspan").text(testLine);
        const textLength = tempTspan.node().getComputedTextLength();
        tempTspan.remove();
        
        if (textLength > rectWidth - 8 && line.length > 1) {
          // Remove last word and create tspan for current line
          line.pop();
          if (lineNumber < maxLines - 1) {
            text.append("tspan")
              .attr("x", 4)
              .attr("dy", lineNumber === 0 ? 0 : lineHeight)
              .text(line.join(' '));
            lineNumber++;
          }
          line = [word];
        }
      });
      
      // Add remaining words if there's space
      if (line.length > 0 && lineNumber < maxLines) {
        text.append("tspan")
          .attr("x", 4)
          .attr("dy", lineNumber === 0 ? 0 : lineHeight)
          .text(line.join(' '));
      }
    }
  });

  // 4. Add tooltips - check if tooltip already exists
  let tooltip = d3.select("body").select(".treemap-tooltip");
  if (tooltip.empty()) {
    tooltip = d3.select("body").append("div")
      .attr("class", "tooltip treemap-tooltip")
      .style("position", "absolute")
      .style("background", "rgba(0, 0, 0, 0.8)")
      .style("color", "white")
      .style("padding", "8px")
      .style("border-radius", "4px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("z-index", "1000")
      .style("opacity", 0);
  }

  nodes.on("mouseover", (event, d) => {
    tooltip.transition().duration(200).style("opacity", 0.9);
    
    const sdgName = globalConstants.sdgNames ? globalConstants.sdgNames[selectedSDG] : `SDG ${selectedSDG}`;
    
    tooltip.html(`
      <strong>Faculty:</strong> ${d.parent.data.name}<br/>
      <strong>Specialization:</strong> ${d.data.name}<br/>
      <strong>Courses addressing ${sdgName}:</strong> ${d.data.value}<br/>
      <em>Click to view course details</em>
    `)
      .style("left", (event.pageX + 10) + "px")
      .style("top", (event.pageY - 10) + "px");
  })
  .on("mousemove", (event) => {
    tooltip
      .style("left", (event.pageX + 10) + "px")
      .style("top", (event.pageY - 10) + "px");
  })
  .on("mouseout", () => {
    tooltip.transition().duration(300).style("opacity", 0);
  })
  .on("click", (event, d) => {
    // Hide tooltip before switching
    tooltip.style("opacity", 0);

    // Switch to heatmap view for the clicked specialization
    currentDiscipline = d.data.id;
    const searchInput = document.getElementById('disciplineSearch');
    const dropdown = document.getElementById('disciplineDropdown');
    
    if (searchInput) {
      searchInput.value = d.data.name; // Update search bar text
    }
    
    if (dropdown) {
      // Update dropdown active state
      dropdown.querySelectorAll('.dropdown-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-value') === d.data.id) {
          item.classList.add('active');
        }
      });
    }

    // Programmatically click the "SDG Coverage within Specialisation" tab button
    const heatmapTabButton = document.querySelector('.tab-button[data-tab-target="#tab1Content"]');
    if (heatmapTabButton) {
      heatmapTabButton.click();
    } else {
      console.error('SDG Coverage tab button not found.');
    }
  });
}
