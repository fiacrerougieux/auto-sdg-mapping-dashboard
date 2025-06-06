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
    .attr("fill", d => {
        // Use SDG color for the selected SDG
        return window.constants.sdgColors[selectedSDG] || color(d.parent.data.code) || '#999999';
    })
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

function createTargetTreemap(data) {
  const treemapDiv = document.getElementById('treemap-by-target-div');
  if (!treemapDiv) {
    console.error('Target treemap div not found');
    return;
  }
  treemapDiv.innerHTML = '';

  const width = treemapDiv.clientWidth;
  const height = treemapDiv.clientHeight;

  if (width < 100 || height < 100) {
    treemapDiv.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">Treemap area too small.</div>';
    return;
  }

  const svg = d3.select(treemapDiv).append("svg")
      .attr("width", width)
      .attr("height", height);

  if (!data || data.length === 0) {
    svg.append("text").attr("x", width / 2).attr("y", height / 2).attr("text-anchor", "middle").text("No data for Target Treemap.");
    return;
  }

  const addressedData = data.filter(d => d.addressed === true || d.addressed === 'yes');
  
  let hierarchy = { name: "All SDGs", children: [] };
  const sdgMap = new Map();

  addressedData.forEach(d => {
    if (!d.target_number) return;

    const sdgNode = sdgMap.get(d.sdg_number) || { name: `SDG ${d.sdg_number}: ${window.constants.sdgNames[d.sdg_number]}`, children: new Map() };
    sdgMap.set(d.sdg_number, sdgNode);

    const targetNode = sdgNode.children.get(d.target_number) || { name: `Target ${d.target_number}`, value: 0, courses: new Set() };
    targetNode.courses.add(d.course_code);
    targetNode.value = targetNode.courses.size;
    sdgNode.children.set(d.target_number, targetNode);
  });

  sdgMap.forEach((sdgNode, sdgNumber) => {
    const sdg = { name: sdgNode.name, children: [] };
    sdgNode.children.forEach(targetNode => {
      sdg.children.push(targetNode);
    });
    hierarchy.children.push(sdg);
  });

  const root = d3.hierarchy(hierarchy).sum(d => d.value);

  d3.treemap()
    .size([width, height])
    .padding(1)
    .paddingOuter(3)
    (root);

  const color = d3.scaleOrdinal(d3.schemeCategory10);

  const nodes = svg.selectAll("g")
    .data(root.leaves())
    .enter().append("g")
      .attr("transform", d => `translate(${d.x0},${d.y0})`);

  nodes.append("rect")
    .attr("width", d => d.x1 - d.x0)
    .attr("height", d => d.y1 - d.y0)
    .attr("fill", d => {
        // Traverse up to find the SDG number from the ancestor node
        let ancestor = d;
        let sdgNumber = null;
        while (ancestor.parent) {
            const match = ancestor.parent.data.name.match(/^SDG (\d+)/);
            if (match) {
                sdgNumber = parseInt(match[1], 10);
                break;
            }
            ancestor = ancestor.parent;
        }
        return sdgNumber ? window.constants.sdgColors[sdgNumber] : color(d.parent.data.name);
    })
    .attr("stroke", "#fff");

  nodes.append("text")
    .selectAll("tspan")
    .data(d => d.data.name.split(/(?=[A-Z][^A-Z])/g))
    .enter().append("tspan")
    .attr("x", 4)
    .attr("y", (d, i) => 13 + i * 10)
    .text(d => d)
    .attr("font-size", "10px")
    .attr("fill", "white");

  let tooltip = d3.select("body").select(".target-treemap-tooltip");
  if (tooltip.empty()) {
    tooltip = d3.select("body").append("div")
      .attr("class", "tooltip target-treemap-tooltip")
      .style("opacity", 0);
  }

  nodes.on("mouseover", (event, d) => {
    tooltip.transition().duration(200).style("opacity", .9);
    tooltip.html(`<strong>${d.parent.data.name}</strong><br/>${d.data.name}<br/>Courses: ${d.data.value}`)
      .style("left", (event.pageX + 5) + "px")
      .style("top", (event.pageY - 28) + "px");
  })
  .on("mouseout", () => {
    tooltip.transition().duration(500).style("opacity", 0);
  });
}

function createSpecialisationTargetTreemap(data) {
  const treemapDiv = document.getElementById('treemap-by-specialisation-target-div');
  if (!treemapDiv) {
    console.error('Specialisation target treemap div not found');
    return;
  }
  treemapDiv.innerHTML = '';

  const width = treemapDiv.clientWidth;
  const height = treemapDiv.clientHeight;

  if (width < 100 || height < 100) {
    treemapDiv.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">Treemap area too small.</div>';
    return;
  }

  const svg = d3.select(treemapDiv).append("svg")
      .attr("width", width)
      .attr("height", height);

  if (!data || data.length === 0) {
    svg.append("text").attr("x", width / 2).attr("y", height / 2).attr("text-anchor", "middle").text("No data for Specialisation Target Treemap.");
    return;
  }

  const filteredData = filterDataByDiscipline(data, currentDiscipline);
  const addressedData = filteredData.filter(d => d.addressed === true || d.addressed === 'yes');
  
  if (addressedData.length === 0) {
    svg.append("text").attr("x", width / 2).attr("y", height / 2).attr("text-anchor", "middle").text(`No targets addressed for ${constants.specializationNames[currentDiscipline] || currentDiscipline}`);
    return;
  }

  let hierarchy = { name: "All SDGs", children: [] };
  const sdgMap = new Map();

  addressedData.forEach(d => {
    if (!d.target_number) return;

    const sdgNode = sdgMap.get(d.sdg_number) || { name: `SDG ${d.sdg_number}: ${window.constants.sdgNames[d.sdg_number]}`, children: new Map() };
    sdgMap.set(d.sdg_number, sdgNode);

    const targetNode = sdgNode.children.get(d.target_number) || { name: `Target ${d.target_number}: ${d.target_name}`, children: new Map() };
    sdgNode.children.set(d.target_number, targetNode);

    const courseNode = targetNode.children.get(d.course_code) || { name: d.course_code, value: 1 };
    targetNode.children.set(d.course_code, courseNode);
  });

  sdgMap.forEach((sdgNode, sdgNumber) => {
    const sdg = { name: sdgNode.name, children: [] };
    sdgNode.children.forEach(targetNode => {
      const target = { name: targetNode.name, children: [] };
      targetNode.children.forEach(courseNode => {
        target.children.push(courseNode);
      });
      sdg.children.push(target);
    });
    hierarchy.children.push(sdg);
  });

  const root = d3.hierarchy(hierarchy).sum(d => d.value);

  d3.treemap()
    .size([width, height])
    .padding(1)
    .paddingOuter(3)
    (root);

  const color = d3.scaleOrdinal(d3.schemeCategory10);


  const nodes = svg.selectAll("g")
    .data(root.leaves())
    .enter().append("g")
      .attr("transform", d => `translate(${d.x0},${d.y0})`);

  nodes.append("rect")
    .attr("width", d => d.x1 - d.x0)
    .attr("height", d => d.y1 - d.y0)
    .attr("fill", d => {
        // Traverse up to find the SDG number from the ancestor node
        let ancestor = d;
        let sdgNumber = null;
        while (ancestor.parent) {
            const match = ancestor.parent.data.name.match(/^SDG (\d+)/);
            if (match) {
                sdgNumber = parseInt(match[1], 10);
                break;
            }
            ancestor = ancestor.parent;
        }
        return sdgNumber ? window.constants.sdgColors[sdgNumber] : color(d.parent.data.name);
    })
    .attr("stroke", "#fff");

  nodes.append("text")
    .attr("fill", "white")
    .each(function(d) {
        const text = d3.select(this);
        const courseName = d.data.name;
        const targetName = d.parent.data.name.split(':')[0]; // e.g., "Target 1.1"
        
        const rectHeight = d.y1 - d.y0;
        const rectWidth = d.x1 - d.x0;

        // Only render text if the box is big enough
        if (rectWidth < 30 || rectHeight < 20) return;

        // Render course code, split if needed
        const courseParts = courseName.split(/(?=[A-Z][^A-Z])/g);
        let yOffset = 13;

        courseParts.forEach((part, i) => {
            if (yOffset < rectHeight - 5) {
                text.append("tspan")
                    .attr("x", 4)
                    .attr("y", yOffset)
                    .text(part)
                    .attr("font-size", "10px");
                yOffset += 10;
            }
        });

        // Render target name on a new line if there is space
        if (yOffset < rectHeight - 5) {
            text.append("tspan")
                .attr("x", 4)
                .attr("y", yOffset)
                .text(`(${targetName})`)
                .attr("font-size", "9px");
        }
    });

  let tooltip = d3.select("body").select(".target-treemap-tooltip");
  if (tooltip.empty()) {
    tooltip = d3.select("body").append("div")
      .attr("class", "tooltip target-treemap-tooltip")
      .style("opacity", 0);
  }

  nodes.on("mouseover", (event, d) => {
    tooltip.transition().duration(200).style("opacity", .9);
    const courseName = window.constants.courseCodeNameMapping[d.data.name] || 'Unknown Course';
    let html = `<strong>${d.data.name}</strong>: ${courseName}`;
    if(d.parent) {
        html = `<strong>${d.parent.data.name}</strong><br/>${html}`;
        if(d.parent.parent) {
            html = `<strong>${d.parent.parent.data.name}</strong><br/>${html}`;
        }
    }
    tooltip.html(html)
      .style("left", (event.pageX + 5) + "px")
      .style("top", (event.pageY - 28) + "px");
  })
  .on("mouseout", () => {
    tooltip.transition().duration(500).style("opacity", 0);
  });
}
