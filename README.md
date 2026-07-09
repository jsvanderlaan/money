# MoneyJurreDev

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.2.5.

## Current Product Scope

money.jurre.dev parses bank transaction .TAB exports, applies rule-based labels, and visualizes spending trends.

## Onboarding and SEO (Phase 6 Started)

The current implementation now includes:

- Onboarding and copy improvements
    - Clear first-run guidance on Home when no transactions are available.
    - Expanded upload instructions on Transactions, including expected .TAB format details.
    - ABN AMRO download walkthrough for .TAB exports.
    - Explicit privacy messaging: transaction processing/storage stays local in the browser.
    - Dataset status summary with transaction count and covered period.
- SEO basics
    - Route-level page titles and meta descriptions.
    - Dynamic canonical, Open Graph, and Twitter meta tags.
    - robots.txt and sitemap.xml served from public assets.

### Static prerender build

Use this command to produce a prerendered production build:

```bash
npm run build:prerender
```

This keeps deployment static-file based while still improving route HTML output for crawlers.

## Phase 1 Improvements (Implemented)

The following Improvement Plan items are now implemented:

- Unlabeled detection primitives
    - Added persisted filter state for unlabeled-only view.
    - Added unlabeled-only toggle in the filter UI.
    - Added Home quick-chip to toggle unlabeled-only mode.
    - Added coverage counters: total, labeled, unlabeled, unlabeled percentage.
- Parse and coverage diagnostics
    - Added parse diagnostics tracking for unknown types and pattern misses.
    - Added read-only diagnostics panel on Home with success ratio and parse metrics.
- Baseline metrics collection
    - Added automatic and manual coverage snapshots.
    - Added delta display between the last two snapshots to monitor labeling progress.

### What "Capture baseline snapshot" does

The Home action "Capture baseline snapshot" stores a timestamped checkpoint of the current coverage values:

- total transactions
- labeled transactions
- unlabeled transactions
- unlabeled percentage

Use this checkpoint before and after label changes to compare progress through the "Last delta" indicator.

### Storage Keys Added in Phase 1

- tx_parse_diagnostics_last
- tx_coverage_snapshots

## Phase 2 Improvements (In Progress)

The first Phase 2 items are now implemented in the Labels page:

- Unlabeled Patterns view
    - Groups recurring unlabeled transactions by merchant and naam.
    - Shows count, total amount, last seen date, confidence hint, and coverage delta estimate.
- Suggestion-to-rule workflow
    - "Create label draft" prefills the label creator from a selected pattern.
    - Suggestion activity is recorded for auditability.
- Labels tab impact checks
    - Per-label impact count and sample impacted transactions are available in the label list.
    - Label editor shows current vs draft impact delta with sample matched transactions.

### Storage Keys Added in Phase 2

- label_suggestion_audit

## Phase 3 Improvements (Implemented)

Phase 3 focuses on label authoring quality and is now available in the Labels workflow:

- Rule expressiveness
    - Added `startsWith`, `endsWith`, and `regex` operators for text-based rules.
    - Added an explicit Regex toggle in the rule editor.
- Overlap and ordering checks
    - The label editor now shows overlap warnings against existing labels.
    - Labels can be moved up or down in the evaluation order.
    - The interface explains when `hasLabel` rules create order dependency.
- Import/export hardening
    - Imported labels are validated with clearer error messages.
    - Export now serializes the actual label array value.

## Phase 4 Improvements (Implemented)

The dashboard and transaction review experience now includes:

- Dashboard hierarchy
    - KPI cards at the top of Home.
    - Sticky filter controls for faster review.
    - Two-column layout with chart and transaction review on larger screens.
- Insights interactivity
    - Chart mode selector: bar, line, and stacked.
    - Click a chart period to drill into that time range.
    - Export chart as PNG and filtered transactions as CSV.
- Transaction review workflow
    - Compact or comfortable row density.
    - More responsive table and detail layout.

### Storage Keys Added in Phase 4

- tx_filters now also stores chart mode and row density preferences.

## Phase 5 Improvements (Implemented)

The current data robustness pass adds:

- Duplicate ingestion protection
    - Transaction imports now skip duplicate rows by default using a stable fingerprint.
    - The Transactions upload form includes an opt-in checkbox to keep duplicates when needed.
- Parser extensibility
    - Parser branches are organized into dedicated handlers for bank-specific description formats.
    - Known transaction string shapes are isolated so new cases can be added with less risk.
- Performance safeguards
    - Insights aggregation caches repeated chart results for the same transaction set and chart settings.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
