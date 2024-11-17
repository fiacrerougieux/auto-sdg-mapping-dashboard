- # SDG Analysis Dashboard

  This interactive dashboard visualizes the coverage of UN Sustainable Development Goals (SDGs) across university courses based on automated text analysis of course descriptions and outlines.

  ## Features

  ### Data Visualization Options
  - **SDG Coverage**: Radar chart showing relative SDG coverage across selected courses
  - **SDG Distribution**: Heatmap showing SDG presence in individual courses
  - **Cumulative SDGs**: Cumulative heatmap showing progressive SDG coverage

  ### Filtering Options
  - Filter by Faculty
  - Filter by Academic Discipline
  - Interactive course selection

  ### Data Display
  - Total number of courses analyzed
  - Detailed hover information showing course codes and SDG justifications
  - Responsive design for desktop and mobile viewing

  ## Technical Details

  ### Dependencies
  - Plotly.js for data visualization
  - Pure JavaScript/HTML/CSS (no additional frameworks required)

  ### Data Format
  The dashboard expects a CSV file (`sdg_analysis.csv`) with the following columns:
  - `course_code`: Unique course identifier (e.g., "COMP1511")
  - `sdg_number`: SDG number (1-17)
  - `sdg_name`: Full name of the SDG
  - `addressed`: Whether the SDG is addressed ("Yes"/"No")
  - `justification`: Text explaining why the SDG is relevant
  - `timestamp`: When the analysis was performed

  ### Notes on Analysis Method
  - Analysis is automated based on course descriptions and outlines
  - Comparative analysis shows certain SDGs tend to be underestimated:
    - SDG 4 (Quality Education)
    - SDG 9 (Industry, Innovation and Infrastructure) 
    - SDG 10 (Reduced Inequalities)
    - SDG 12 (Responsible Consumption and Production)

  ## Usage

  1. Host the files on a web server
  2. Ensure `sdg_analysis.csv` is in the same directory
  3. Open index.html in a web browser

  ## Limitations
  - Analysis is automated and may not capture all SDG connections
  - Results should be used as indicative rather than definitive
  - Manual verification recommended for detailed curriculum mapping
