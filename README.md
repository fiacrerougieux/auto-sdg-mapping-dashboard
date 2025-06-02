# SDG Analysis Dashboard

**Note: This dashboard is a work in progress.**

This interactive dashboard visualizes the coverage of UN Sustainable Development Goals (SDGs) across university courses, based on automated text analysis of course information. It aims to provide insights into how SDGs are integrated into the curriculum.

## Key Visualizations & Features

The dashboard offers several ways to explore SDG coverage:

*   **Bubble Chart**:
    *   Displays the percentage of courses within each specialization that address a user-selected SDG.
    *   Bubble size indicates the total number of courses in a specialization.
    *   Bubbles are color-coded by faculty.
    *   Clicking a specialization bubble transitions to the Heatmap view for that specialization.

*   **Paired Heatmap & Lollipop Chart View** (for a selected specialization):
    *   **Heatmap**:
        *   Shows SDG presence across individual courses within the selected specialization.
        *   Courses are typically on the X-axis, and SDGs (excluding SDG 4: Quality Education) on the Y-axis.
        *   Can display either:
            *   **Binary View**: Indicates if an SDG is addressed ('Yes'/'No') by a course.
            *   **Cumulative View**: Shows the progressive count of courses addressing each SDG.
        *   Clicking an SDG label switches to the Bubble Chart for that SDG.
    *   **Lollipop Chart**:
        *   Complements the Heatmap, showing the overall percentage coverage for each SDG (excluding SDG 4) within the selected specialization.
        *   SDGs are on the X-axis, and percentage coverage on the Y-axis.
        *   Clicking an SDG on its axis switches to the Bubble Chart for that SDG.

*   **Interactive Exploration**:
    *   **Welcome Modal**: Introduces the dashboard, its functionalities, and important disclaimers (e.g., v3 data is conservative, optimized for precision).
    *   **Search & Filtering**: Users can search for specializations and select specific SDGs to focus the analysis.
    *   **Data Version Toggle**: Switch between different underlying analysis datasets (v1, v2, v3) which may vary in precision/recall. v3 (`sdg_analysis_llm_with_targets_and_names.csv`) is the default.
    *   **Theme Toggle**: Switch between light and dark modes.
    *   **Export**: Download visualizations as PNG images.
    *   **Tooltips**: Provide detailed information on hover for courses, SDGs, and data points.

*   **Method Validation Heatmap**:
    *   Accessible via a modal, this chart displays F1 scores comparing different SDG mapping methodologies, using data from `comparison_heatmap_f1_scores_ordered.csv`.

## Technical Details

*   **Core Technologies**: Built with plain HTML, CSS, and JavaScript.
*   **Visualization Libraries**: Uses D3.js and Plotly.js.
*   **Data Sources**:
    *   Primary analysis data: `sdg_analysis_llm_with_targets_and_names.csv` (default v3), with options for `sdg_analysis_llm_match.csv` (v1) and `sdg_analysis_llm.csv` (v2). These files typically include:
        *   `course_code`, `sdg_number`, `sdg_name`, `addressed` (Yes/No), `justification`, `timestamp`, `target_number`, `target_name`, `course_name`.
    *   Supporting data:
        *   `constants.json`: Contains mappings like SDG names, faculty mappings, specialization names.
        *   `course_code_name_mapping.csv`: Maps course codes to full course names.
        *   `comparison_heatmap_f1_scores_ordered.csv`: Data for the method validation heatmap.

## Notes on Analysis Method
- Analysis is automated based on course descriptions and outlines.
- The default v3 analysis is optimized for high precision, which means it tends to be conservative and may underestimate SDG coverage (lower recall). Earlier versions (v1, v2) offer higher recall but lower precision.
- Comparative analysis shows certain SDGs tend to be underestimated by automated methods, including:
    - SDG 4 (Quality Education) - *Note: SDG 4 is generally excluded from the main heatmap/lollipop displays due to its pervasive nature in educational contexts, which can skew comparative visualization if not handled separately.*
    - SDG 9 (Industry, Innovation and Infrastructure)
    - SDG 10 (Reduced Inequalities)
    - SDG 12 (Responsible Consumption and Production)

## Usage

1.  Host the files on a web server or open `index.html` directly in a modern web browser.
2.  Ensure all required CSV and JSON data files are in the same directory as `index.html`.

## Community and Contribution

We welcome contributions and feedback to improve this dashboard. Please see the following resources:
- **[Contributing Guidelines](CONTRIBUTING.md)**: How to contribute to the project.
- **[Code of Conduct](CODE_OF_CONDUCT.md)**: Our expectations for community interactions.
- **[Security Policy](SECURITY.md)**: How to report security vulnerabilities.
- **[License](LICENSE)**: The project is licensed under the MIT License.

## Limitations
- Analysis is automated and may not capture all SDG connections or nuances.
- Results should be used as indicative for exploration and discussion, rather than as definitive statements of SDG coverage.
- Manual verification and detailed curriculum mapping are recommended for precise assessments.
