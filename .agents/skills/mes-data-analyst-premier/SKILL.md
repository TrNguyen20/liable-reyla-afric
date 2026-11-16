---
name: mes-data-analyst-premier
description: Premier data analytics, ETL pipeline verification, statistical modeling, cohort/funnel analysis, and executive BI dashboarding using the obra/superpowers agent methodology (Brainstorming -> Spec Writing -> TDD Data Validation -> Sub-agent Execution -> Self-Review & Continuous Knowledge Updating). Use whenever the user asks for advanced data analysis, SQL/Python/DuckDB/Polars pipelines, KPI reporting, anomaly root-cause debugging, A/B testing, or building self-updating data agent workflows.
---

# Data Analyst Premier (Superpowers Edition)

Premier data analytics skill combining advanced analytical rigor with the obra/superpowers agentic workflow. Never jump straight to writing ad-hoc queries or charts; enforce disciplined specification, Test-Driven Data Analysis (TDDA), systematic root-cause debugging, and continuous knowledge-base self-updating.

## When to Use
- Analyzing complex datasets (CSV, Parquet, SQL databases, Excel, JSON logs, Google Sheets) for manufacturing/financial insights, cohorts, retention, unit economics, or anomaly detection.
- Designing, building, or refactoring SQL/dbt models, Python (Polars/Pandas/DuckDB) pipelines, or executive BI dashboards (like DYNAMO MES Dashboard).
- Designing or evaluating KPI reporting, causal inference, and predictive forecasts.
- Operating as an autonomous Senior Data Analyst Agent that maintains and updates its own domain knowledge base (`references/knowledge-base.md`) and adapts obra/superpowers workflows.

## Core Superpowers Protocol for Data Analysis
Follow the 5-stage Superpowers Loop for every non-trivial analytical task. Do not skip stages.

### Stage 1: Brainstorming & Grain Alignment (`superpowers:brainstorming`)
Before writing any extraction or transformation code:
1. **Clarify the Decision**: Identify what concrete business decision or operational action this analysis will drive.
2. **Define the Grain**: Explicitly state the primary key and grain of the target dataset (e.g., one row per `ID_Key` lot, or one row per `So_DatHang` order per period).
3. **Map Edge Cases Upfront**: List timezone rules, currency conversions (VND), NULL handling, late-arriving records, and role-based data permissions (`canViewPricing`, `formatVendorName`).
4. **Consult Knowledge Base**: Read `references/knowledge-base.md` to check existing metric definitions, schema quirks, and business formulas.

### Stage 2: Analytical Spec & Execution Plan (`superpowers:write-plan`)
For multi-step analyses, write a concise structured plan before executing:
1. **Hypothesis**: State the primary operational or financial hypothesis to test.
2. **Data Lineage**: Raw Google Sheets / DB -> Normalized Dataset -> Aggregation Logic -> Executive Visualization.
3. **Verification Invariants**: Define mathematical invariants that must hold:
   - `All-Time Cumulative Cost >= Period Cost`
   - `Total WIP Lots == Sum(status != 'DONE')`
   - `0.0 <= OTD Rate <= 1.0`
   - `Cost-at-Risk == Sum(thanh_tien of overdue lots)`

### Stage 3: Test-Driven Data Analysis - TDDA (`superpowers:tdd`)
Adapt the Red-Green-Refactor cycle to data pipelines, analytical logic, and dashboard components:
1. **RED (Write Assertions First)**: Write schema, grain, and boundary assertions before computing final metrics. Run `scripts/validate_dataset.py` or unit tests to verify raw data assumptions.
2. **GREEN (Implement Transformation)**: Write modular, vectorized, or memoized transformations (prefer clean TypeScript memoization, DuckDB, or Polars).
3. **REFACTOR (Optimize & Clean)**: Eliminate magic numbers, parameterize thresholds, document assumptions, ensure high-density 2px Graphite Wireframe compliance (`rounded-xs`, `font-mono tabular-nums`).

### Stage 4: Systematic Debugging for Data Anomalies (`superpowers:systematic-debugging`)
When a metric spikes, drops, or fails reconciliation, never guess:
1. **Isolate the Layer**: Bisect the pipeline (Raw Ingestion -> Cleaning/Filtering -> Joins/Mappings -> Aggregation -> UI Component).
2. **Check Join / Grouping Explosion**: Verify record counts before and after every join or grouping.
3. **Decompose the Metric**: Break composite ratios (e.g., OTD Rate, Unit Cost/Kg) into numerator and denominator trends across key dimensions (Vendor, Workshop, Period, Item Category).
4. **Verify Completeness**: Check for sync drops, schema drift, or invalid date parsing.

### Stage 5: Two-Stage Review & Auto-Knowledge Update (`superpowers:review & self-update`)
Before delivering the final output:
1. **Stage A - Spec Compliance Review**: Does the output answer the exact prompt, respect data grain, and pass all invariant checks?
2. **Stage B - Analytical Quality Review**: Are visualizations clear and high-contrast? Are insights framed with Headline + Quantified Impact + Root Cause + Actionable Recommendation?
3. **Continuous Knowledge Base Update**: Whenever you discover a new schema rule, business metric formula, data anomaly pattern, or user preference, append it to `references/knowledge-base.md` so future sessions inherit the knowledge automatically.

## Output Standards (Premier Executive Format)
Structure analytical deliverables with high signal-to-noise ratio:
- **Executive Headline**: Lead with the quantified conclusion in Sentence 1 (e.g., "Tổng chi phí nhiệt luyện toàn thời gian đạt 4.82 tỷ VNĐ, trong đó rủi ro đọng vốn (Cost-at-Risk) chiếm 3.4% tập trung tại 2 đối tác chính.").
- **Reconciliation & Data Health Badge**: State row counts, period covered, excluded records, and invariant check status (PASSED).
- **Key Findings & Evidence Matrix**: Clean industrial bento tables or wireframe SVG charts comparing segments, workshops, or periods with absolute numbers and relative deltas.
- **Prioritized Recommendations**: Concrete operational actions ranked by Expected Impact vs. Implementation Effort.
