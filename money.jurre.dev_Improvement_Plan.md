# money.jurre.dev Improvement Plan

## Objective

Elevate labeling quality, speed up label authoring, and redesign the UI/UX while preserving existing functionality.

## Guiding Constraints

- Keep all existing workflows operational; changes are additive.
- Do not remove current routes or storage keys without migration.
- Keep terminology and domain language consistent with current app usage.

## Implementation Status

- Phase 1 is implemented.
- Phase 2 is implemented.
- Phase 3 is implemented.
- Phase 4 is implemented.
- Phase 5 is implemented.
- Phase 6 is in progress.

## Phase 6: Onboarding, Trust Messaging, SEO, and Static Prerender

1. Improve first-run onboarding and page copy. [In Progress]

- [Done] Added explicit first-run guidance on Home when there are no transactions.
- [Done] Added clearer purpose/next-step copy on Labels and empty states.
- [Done] Added stronger empty-state guidance in transaction review.

2. Improve Transactions upload guidance and trust messaging. [In Progress]

- [Done] Added explicit expected upload format details for .TAB imports.
- [Done] Added ABN AMRO download path example for .TAB files.
- [Done] Added clear privacy message that processing/storage stays local in the browser.
- [Done] Added visible dataset summary (count + period) on the Transactions page.

3. Add SEO baseline assets and route metadata. [In Progress]

- [Done] Added route-level titles and descriptions.
- [Done] Added dynamic canonical/Open Graph/Twitter metadata updates.
- [Done] Added `public/robots.txt` and `public/sitemap.xml`.

4. Enable static prerender generation for app routes. [In Progress]

- [Done] Added server entry and SSR config required for prerender builds.
- [Done] Added `build:prerender` command.
- [Done] Confirmed prerender generation for 3 static routes (`/`, `/transactions`, `/labels`).
- [Done] Made browser-only chart/storage code SSR-safe for prerender execution.

5. Validation and polish. [Planned]

- Run final UX content review for wording and hierarchy.
- Verify deployment serves prerender output and crawl assets as expected.
- Decide whether to raise bundle budget or optimize initial bundle size.

## Phase 1: Label Coverage and Observability

1. Add unlabeled detection primitives. [Done]

- Extend filter state with `unlabeledOnly`.
- Add UI toggle in filters and quick-chip on Home.
- Add counters: total transactions, labeled, unlabeled, unlabeled percentage.

2. Add parse and coverage diagnostics. [Done]

- Track unknown/unsupported parse cases from parsing service.
- Surface diagnostics panel with parse success ratio and unknown-type counts.
- Keep diagnostics read-only in first release.

3. Add baseline metrics collection. [Done]

- Store lightweight coverage snapshots (date, total, labeled, unlabeled).
- Use snapshots to measure improvement after label changes.

## Phase 2: Pattern Discovery and Rule Suggestions

1. Build an Unlabeled Patterns view. [Done]

- Group unlabeled transactions by merchant, naam, normalized description prefix, and amount bands.
- Group unlabeled transactions by merchant and naam.
- Show frequency, total value, and last-seen date.

2. Add suggestion-to-rule workflow. [Done]

- From a pattern row, open label creator prefilled with candidate conditions.
- Require manual confirmation before save.
- Record suggestion source for auditability.

3. Add pattern quality controls. [Done]

- Show confidence hints (support count and coverage delta estimate).
- Suppress low-frequency noise by threshold.

4. Integrate in the current labels tab. [Done]

- make it easy to check which transactions are impacted by a rule.
- make it easy to check changes to a rule and the impact on which transactions it would label

## Phase 3: Label Authoring UX and Accuracy

1. Add live rule preview. [Done]

- In label creator, show real-time count of matching transactions.
- Provide sample match list and false-positive spot-checking.

2. Improve rule expressiveness safely. [Done]

- Add optional operators: `startsWith`, `endsWith`.
- Add optional regex mode behind explicit toggle.
- Expand selectable fields to currently parsed extras where available.

3. Add overlap and ordering checks. [Done]

- Warn when new rules strongly overlap existing labels.
- Warn when `hasLabel` dependencies create brittle order coupling.
- Add explicit label ordering controls and explain impact.

4. Harden label import/export. [Done]

- Ensure export serializes label values, not signal wrapper references.
- Add JSON schema validation and actionable import error messages.

## Phase 4: Dashboard and Table Redesign

1. Redesign Home information hierarchy. [Done]

- Top area: KPI cards and quick actions.
- Middle: insights with clearer legend and scale semantics.
- Bottom: transaction review table.

2. Upgrade transaction review workflow. [Done]

- Add compact/default density modes.
- Add multi-select rows and bulk label assignment.
- Add persistent filter bar and keyboard-friendly interactions.

3. Improve insights interactivity. [Done]

- Add chart type selector (bar, line, stacked by label).
- Add click-through filtering from chart period to table rows.
- Add export for chart image and filtered transaction CSV.

4. Improve responsive behavior. [Done]

- Define mobile-first breakpoints for filter controls.
- Provide card/list variant for transactions on small screens.
- Ensure touch target sizes and spacing are consistent.

## Phase 5: Data Robustness and Performance

1. Add duplicate ingestion protection.

- [Done] Compute transaction fingerprint on import and skip duplicates by default.
- [Done] Provide optional include-duplicates override.

2. Stabilize parse extensibility.

- [Done] Isolate parser patterns into maintainable mapping structures.
- [Done] Add parse fixture coverage for known bank transaction strings.

3. Performance safeguards.

- [Done] Memoize expensive aggregations.
- [Planned] Consider worker offload when transaction counts exceed threshold.

## Delivery Sequence (Recommended)

1. Phase 1 (coverage visibility) to expose immediate labeling gaps.
2. Phase 2 and Phase 3 in parallel (pattern discovery + authoring improvements).
3. Phase 4 after workflow requirements are validated by Phase 1 metrics.
4. Phase 5 continuously, with duplicate prevention prioritized early.

## Acceptance Criteria

1. Users can isolate unlabeled transactions in one click.
2. Users can view recurring unlabeled patterns and create labels from them.
3. Label creator provides live match preview before saving.
4. Bulk labeling and denser review table reduce manual effort.
5. Dashboard clearly communicates labeling coverage and trend insights.
6. Existing import, labeling, filtering, and insights behavior remains available.

## Conflict Handling

If a proposed enhancement risks changing current behavior, ship it behind a feature toggle or opt-in setting first, then migrate gradually after validation.
