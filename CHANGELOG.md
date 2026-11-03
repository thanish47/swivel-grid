# Changelog

All notable changes to SwivelGrid are documented here.

---

## [1.0.0] - 2026-11-03

### Added

- **Micro-core + extension architecture** — `SwivelGrid.js` reduced to a 846-line host with a hook-based extension system. Extensions attach via `registerExtension` and participate in `beforeRender` / `afterRender` hook chains, priority-sorted.
- **7 built-in extensions:**
  - `LayoutRendererExtension` — generates table/grid HTML into `context.layoutHTML`
  - `TemplateExtension` — processes `cellTemplate` and `headerTemplate` column fields; provides `renderRating`, `renderImage`, `formatDate`, `formatNumber`, `formatCurrency`, `capitalize`, `truncate` helpers
  - `SortingExtension` — column-click sort with `ASC`/`DESC` cycle; custom `sortComparator` support
  - `SearchExtension` — binds to an external `<input>` via CSS selector; filters rows on `input` event
  - `PaginationExtension` — page-size control; injects `appendData`, `setPageData`, `pageSize`, and `totalPages` onto the grid instance; dispatches `swivel:pageThreshold`
  - `CssClassesExtension` — applies `cellClass`, `headerClass`, `rowClass` (static or function) per column definition
  - `AccessibilityExtension` — adds ARIA roles, `aria-sort`, `aria-label`, and keyboard navigation to rendered tables
- **StandardBundle** — loads LayoutRenderer + Templates + Sorting in one call (`StandardBundle.loadInto(grid)`)
- **AdvancedBundle** — loads all 7 extensions; provides `getPresets()` and `loadSubsetInto(grid, names[])` for partial loading
- **BundleLoader** — use-case routing (`loadForUseCase`, `loadPreset`), `recommendBundle(requirements)`, `loadFromConfig`, static `quickLoad` shortcuts, history tracking
- **BundleBuilder** — chainable programmatic bundle composition: `addFeature`, `removeFeature`, `withConfig`, `resolveDependencies`, `validate`, `estimateSize`, `build`; serialization via `toConfig` / `fromConfig`; 6 named presets (`table-focused`, `designer`, `data-heavy`, `minimal-interactive`, `dashboard`, `enterprise`)
- **ExtensionLoader** — `loadMinimalSetup`, `loadStandardSetup`, `loadAdvancedSetup`; `loadCustomBundle`, `createCustomSetup`, `lazyLoad` (dynamic import); per-extension enable/priority control
- **`SwivelGrid.swapExtension(name, newInstance)`** — hot-replace a registered extension without disturbing others
- **`SwivelGrid.toggleExtension(name, enabled, rerender?)`** — enable/disable an extension with optional re-render
- **TableVirtualizer** — fixed-row-height virtualization for table layouts (> 500 rows)
- **GridVirtualizer** — estimated-height virtualization for grid/card layouts
- **439 automated tests** — Vitest + jsdom across 22 test files; 100% passing

### Changed

- **Monolithic `SwivelGrid.js`** (~1,265 lines) decomposed into composable extension system. Core retains graceful-degradation fallbacks for grids with no extensions registered.
- Extension registration order now enforces priority — lower priority number runs first, regardless of registration order.

### Deprecated

- **`column.type: 'rating'`** — still works via a compatibility shim in `LayoutRendererExtension`, but emits a `console.warn`. Migrate to `cellTemplate: '{{renderRating(value)}}'`. See [COLUMN_TYPES_TO_TEMPLATES_MIGRATION.md](COLUMN_TYPES_TO_TEMPLATES_MIGRATION.md).
- **`column.type: 'image'`** — same as above; migrate to `cellTemplate: '{{renderImage(value)}}'`.
