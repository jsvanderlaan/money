# money.jurre.dev Project Review

## Purpose

money.jurre.dev is an Angular web application for importing bank transactions from `.TAB` files, parsing them into structured records, applying rule-based labels, and showing spending trends.

The operational goal is to help users categorize bank transactions consistently and surface cost/spending patterns through filters and charts.

## Organization

The codebase is organized by feature-oriented Angular pages, reusable components, and domain services.

- Entry and routing
    - `src/app/app.component.html`: top navigation and router outlet.
    - `src/app/app.routes.ts`: routes for Home, Labels, and Transactions.
- Pages
    - `src/app/pages/home.component.ts` + `.html`: dashboard composition (filters, insights, table).
    - `src/app/pages/transactions.component.ts` + `.html`: file upload and processing flow.
    - `src/app/pages/labels.component.ts` + `.html`: label CRUD and label import/export.
- Components
    - `src/app/components/transactions-filter/*`: text/date/label/sort/group filters.
    - `src/app/components/transactions-table/*` and `transaction-row/*`: list rendering and row detail expansion.
    - `src/app/components/insights/*`: Chart.js visualization.
    - `src/app/components/label-creator/*`: nested rule builder for label definitions.
- Services
    - `src/services/parse.service.ts`: `.TAB` parsing and transaction type extraction.
    - `src/services/transaction.service.ts`: in-memory transaction state and computed filtering/sorting pipeline.
    - `src/services/label.service.ts`: ordered rule evaluation and label assignment.
    - `src/services/filter.service.ts`: persisted filter state.
    - `src/services/insights.service.ts`: time aggregation for chart data.
    - `src/services/storage.service.ts`: localStorage wrapper.
- Types and constants
    - `src/types/transaction.type.ts`: transaction schema and enum types.
    - `src/types/label.type.ts`: rule-tree model (`condition`, `group`, `hasLabel`).
    - `src/constants/default-labels.contants.ts`: initial labels.

## Implementation

### 1) Ingestion and parsing

Users upload one or more `.TAB` files on the Transactions page. `TransactionsComponent.processFiles()` reads text content, combines it, and sends it to `ParseService.parseTabFile()`.

`ParseService` maps each row into a `Transaction` by parsing:

- date and numeric amount fields,
- raw description,
- inferred transaction type,
- extracted optional fields such as merchant, naam, iban, bic, city, and countryCode.

Parsed transactions are persisted through `TransactionService.set()` under `uploaded_tabs_transactions`.

### 2) Labeling model and rule execution

Labels are persisted in localStorage (`labels`) and represented as nested rule trees:

- `condition`: field/operator/value matching,
- `group`: boolean composition (`and`/`or`),
- `hasLabel`: dependency on previously applied labels.

`LabelService.applyLabels()` evaluates enabled labels in order for each transaction and appends matching label references. Because `hasLabel` depends on already applied labels, label order is behaviorally relevant.

### 3) Filtering and list output

`FilterService` stores and persists text search, date range, selected labels, sort state, and granularity (`tx_filters`).

`TransactionService.transactions` is a computed pipeline that:

1. clones cached transactions,
2. applies labels,
3. applies text/date/label filters,
4. sorts by date or amount,
5. returns rendered results to the table and chart consumers.

### 4) Insights and display

`InsightsService.aggregatedData` groups filtered transactions by day/week/month/year and sums amounts per period.

`InsightsComponent` renders this data as a Chart.js bar chart. Home page composition shows filters, then insights, then the transaction table.

## Improvement Opportunities

### A. Detect unlabeled transactions and missing labels

Current behavior supports filtering by selected labels, but there is no first-class way to isolate transactions with no labels.

Additive opportunities:

- Add an `unlabeledOnly` filter state and UI toggle.
- Add an "Unlabeled" quick chip on Home for one-click triage.
- Add an unlabeled summary panel: count, percentage, and trend over selected period.
- Add an optional "Unknown type" quick filter (`transaction.type` missing) to catch parser misses early.

### B. Identify common unlabeled patterns

No current view ranks recurring unlabeled records.

Additive opportunities:

- Introduce an "Unlabeled Patterns" view grouped by normalized keys:
    - merchant
    - naam
    - description prefix
    - absolute amount bands
    - city/countryCode where present
- Show frequency and total spend per group.
- Provide "Create label from this pattern" action that prefills rule builder fields.
- Keep this advisory-only; user confirms final rule before save.

### C. Streamline label creation and improve labeling accuracy

Current rule authoring is powerful but requires trial-and-error.

Additive opportunities:

- Add live rule preview: matching transaction count and sample matches.
- Add conflict warnings for overlapping labels and order-dependent `hasLabel` rules.
- Expand condition fields to include more parsed attributes already present in `TransactionExtra`.
- Add operator improvements (`startsWith`, `endsWith`, optional regex mode with guardrails).
- Add safer import/export behavior:
    - export should serialize actual label array value,
    - import should validate schema and report row-level issues.

### D. UI/UX shortcomings and redesign direction

The current interface is functional but visually plain and workflow-light for high-volume review.

Additive opportunities:

- Information architecture
    - Promote a dashboard hierarchy: KPI cards (total, labeled, unlabeled, parse warnings) above chart/table.
    - Keep filters sticky while scrolling.
- Table ergonomics
    - Add compact density mode and column alignment improvements.
    - Add row selection and bulk labeling.
    - Add keyboard-friendly navigation for review workflows.
- Insights
    - Add chart mode switch (bar/line/stacked by label).
    - Add click-to-filter from chart periods into the table.
- Mobile/responsive
    - Add dedicated mobile table cards and touch-safe control spacing.
- Visual language
    - Introduce clearer spacing scale, stronger typography hierarchy, and consistent color tokens.

### E. Reliability and data quality hardening

Additive opportunities:

- Parse diagnostics panel: unmatched lines, unknown description types, and parse success ratio.
- Duplicate upload prevention using deterministic transaction fingerprinting.
- Optional timezone handling policy for date interpretation consistency.
- Performance guardrails for large datasets (memoization or worker-based heavy aggregation).

---

This review is based on the existing Angular application source and current localStorage-based architecture, and all recommendations are additive so existing behavior can remain available while enhancements are introduced incrementally.
