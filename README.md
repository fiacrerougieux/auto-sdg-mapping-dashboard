# SDG Analysis Dashboard

**Note: This dashboard is a work in progress.**

This interactive dashboard visualizes the coverage of UN Sustainable Development Goals (SDGs) across university courses, based on automated text analysis of course information. It aims to provide insights into how SDGs are integrated into the curriculum.

## Key Visualizations & Features

The dashboard is organized into several tabs, each offering a unique perspective on SDG coverage:

### University-Wide Views

*   **University Goals (Donut Chart)**:
    *   Provides a high-level overview of how many courses across the entire university address each SDG.
    *   Each slice of the donut represents an SDG, with the size indicating the total count of courses mapped to it.
    *   Hovering over a slice reveals the exact number and percentage of courses.

*   **University Targets (Treemap)**:
    *   Offers a detailed breakdown of SDG coverage by specific targets.
    *   The treemap visualizes all 169 SDG targets, with the size of each rectangle proportional to the number of courses addressing that target.
    *   This view helps identify which specific SDG targets are most prominent in the curriculum.

### Specialisation-Specific Views

*   **Specialisation Goals (Heatmap & Radar Chart)**:
    *   This is the default view, providing a deep dive into a selected specialisation.
    *   **Heatmap**: Shows the presence of each SDG across all individual courses within the specialisation.
    *   **Radar Chart**: Complements the heatmap, showing the overall percentage coverage for each SDG within the specialisation, allowing for easy comparison of SDG focus.

*   **Specialisation Targets (Treemap)**:
    *   Similar to the university-wide target view, but filtered for a single specialisation.
    *   Visualizes which specific SDG targets are addressed by the courses within the selected specialisation.

### SDG-Focused View

*   **SDG Breakdown (Bubble Chart & Treemap)**:
    *   Focuses on a single, user-selected SDG.
    *   **Bubble Chart**: Displays the percentage of courses within each specialisation that address the selected SDG. Bubble size indicates the total number of courses in that specialisation.
    *   **Treemap**: Shows the breakdown of the selected SDG by its specific targets, with rectangle size representing the number of courses mapped to each target across all specialisations.

### Other Features

*   **Interactive Exploration**:
    *   **Welcome Modal**: A comprehensive introduction to the dashboard's features, data, and limitations.
    *   **Search & Filtering**: Users can search for specialisations and select specific SDGs to focus the analysis.
    *   **Data Version Toggle**: Switch between three different analysis datasets (v1, v2, v3) which vary in their precision/recall trade-off. The default (v3) is optimized for high precision.
    *   **Theme Toggle**: Switch between light and dark modes for comfortable viewing.
    *   **Export**: Download any visualization as a high-quality PNG image.
    *   **Tooltips**: Detailed information is available on hover for most data points.

*   **Method Validation Heatmap**:
    *   Accessible via a button on the bottom bar, this modal displays a heatmap of F1 scores comparing different SDG mapping methodologies. This provides transparency into the performance of the underlying automated analysis.

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
