function createBarChart(data, courseNameMapping) {
    // Remove any existing tooltips from the body
    d3.select('body').select('.tooltip').remove();
    
    // Remove hover listeners from the container div
    d3.select('#radar-div').on('mouseover', null).on('mouseout', null);

    data = filterDataByDiscipline(data, currentDiscipline);

    const targetDivId = 'radar-div'; // Keep using the same div for now
    const plotContainer = document.getElementById(targetDivId);
    if (!plotContainer) {
        console.error(`Target container #${targetDivId} not found.`);
        return;
    }
    // Clear previous plot
    d3.select(`#${targetDivId}`).html('');

    // Filter out SDG 4
    const sdgNumbers = Array.from({
        length: 17
    }, (_, i) => i + 1).filter(sdg => sdg !== 4);

    // Calculate total number of unique courses in the filtered data
    const totalCourses = new Set(data.map(d => d.course_code)).size;

    const isV4Data = data.some(d => ['weak', 'intermediate', 'strong'].includes(d.alignment));

    let series;
    const levels = isV4Data ? ['weak', 'intermediate', 'strong'] : ['present'];

    if (isV4Data) {
        const processedData = sdgNumbers.map(sdg => {
            const entry = {
                sdg: sdg.toString()
            };
            levels.forEach(level => {
                entry[level] = 0;
            });

            data.forEach(row => {
                if (row.sdg_number == sdg) {
                    if (levels.includes(row.alignment)) {
                        entry[row.alignment]++;
                    }
                }
            });

        // Convert counts to percentages
        levels.forEach(level => {
            entry[level] = totalCourses > 0 ? (entry[level] / totalCourses) * 100 : 0;
        });

        return entry;
        });
        const stack = d3.stack().keys(levels);
        series = stack(processedData);
    } else {
        const processedData = sdgNumbers.map(sdg => {
            let count = 0;
            data.forEach(row => {
                if (row.sdg_number == sdg && row.addressed) {
                    count++;
                }
            });
            return {
                sdg: sdg.toString(),
                present: totalCourses > 0 ? (count / totalCourses) * 100 : 0
            };
        });
        const stack = d3.stack().keys(levels);
        series = stack(processedData);
    }

    // Calculate dimensions
    const margin = {
        top: 20,
        right: 20,
        bottom: 40,
        left: 50
    };
    const width = plotContainer.offsetWidth - margin.left - margin.right;
    const height = plotContainer.offsetHeight - margin.top - margin.bottom;

    // --- Determine theme colors ---
    const isDarkTheme = document.body.classList.contains('dark-theme');
    const themeTextColor = isDarkTheme ? '#00e8ff' : 'black';
    const themeBgColor = isDarkTheme ? '#0a0e17' : '#ffffff';
    const themeGridColor = isDarkTheme ? '#2a3446' : '#dde';
    const themeGridTextColor = isDarkTheme ? '#88a0cc' : '#666';

    const baseColor = isDarkTheme ? '0, 232, 255' : '0, 123, 255';
    const color = d3.scaleOrdinal()
        .domain(levels)
        .range(isV4Data ? [`rgba(${baseColor}, 0.35)`, `rgba(${baseColor}, 0.65)`, `rgb(${baseColor})`] : [`rgb(${baseColor})`]);


    // Create SVG
    const svg = d3.select(`#${targetDivId}`)
        .append('svg')
        .attr('width', plotContainer.offsetWidth)
        .attr('height', plotContainer.offsetHeight)
        .style('background-color', themeBgColor)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create scales
    const xScale = d3.scaleBand()
        .domain(sdgNumbers.map(d => d.toString()))
        .range([0, width])
        .padding(0.3);

    const yScale = d3.scaleLinear()
        .domain([0, 100])
        .range([height, 0])
        .nice();

    // Create axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale).ticks(5).tickFormat(d => `${d}%`);

    // Add x-axis
    const xAxisGroup = svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(xAxis);

    xAxisGroup.selectAll('text')
        .style('text-anchor', 'middle')
        .style('fill', themeTextColor)
        .style('font-size', '10px')
        .attr('dy', '1em');

    xAxisGroup.select('.domain').style('stroke', themeGridColor);
    xAxisGroup.selectAll('.tick line').style('stroke', themeGridColor);

    // Add X Axis Label
    svg.append("text")
        .attr("class", "x axis-label")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 5)
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
        .attr("y", 0 - margin.left + 15)
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

    // Add bars
    svg.append('g')
        .selectAll('g')
        .data(series)
        .enter().append('g')
        .attr('fill', d => color(d.key))
        .selectAll('rect')
        .data(d => d)
        .enter().append('rect')
        .attr('x', d => xScale(d.data.sdg))
        .attr('y', d => yScale(d[1]))
        .attr('height', d => yScale(d[0]) - yScale(d[1]))
        .attr('width', xScale.bandwidth());

    // Create tooltip
    const tooltip = d3.select('body').append('div')
        .attr('class', 'tooltip bar-tooltip')
        .style('position', 'absolute')
        .style('visibility', 'hidden')
        .style('pointer-events', 'none');

    // Add tooltip interaction
    svg.selectAll('rect')
        .on('mouseover', function(event, d) {
            const level = d3.select(this.parentNode).datum().key;
            const percentage = d.data[level];
            const sdgName = constants.sdgNames[d.data.sdg] || `SDG ${d.data.sdg}`;

            tooltip.html(`<b>${sdgName}</b><br>${level}: ${percentage.toFixed(2)}%`)
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
