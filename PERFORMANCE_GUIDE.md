# SwivelGrid Performance Guide

Choosing the right bundle, understanding render costs, and knowing when to reach for virtualization.

---

## Bundle Size Comparison

| Configuration | Extensions loaded | Source lines | Est. min. KB |
|---|---|---|---|
| Core only (no extensions) | none | ~846 | ~18 |
| Minimal setup | layout-renderer | ~1,457 | ~26 |
| Standard bundle | layout-renderer + templates + sorting | ~2,573 | ~38 |
| Advanced bundle | all 7 extensions | ~4,699 | ~68 |

Line counts are source lines including comments. Minified estimates assume ~60% reduction from whitespace/comment stripping.

**Per-extension cost:**

| Extension | Est. min. KB | Source lines |
|---|---|---|
| LayoutRendererExtension | 8 | ~611 |
| PaginationExtension | 6 | ~450 |
| TemplateExtension | 5 | ~350 |
| SortingExtension | 4 | ~310 |
| AccessibilityExtension | 4 | ~290 |
| SearchExtension | 3 | ~210 |
| CssClassesExtension | 3 | ~180 |

---

## Choosing the Right Bundle

### Quick decision matrix

| I need… | Use |
|---|---|
| Just a table, no interactions | `loadMinimalSetup` → layout-renderer only |
| Sortable table with styled templates | `StandardBundle` or `loadStandardSetup` |
| Search + pagination | `AdvancedBundle` or `table-focused` preset |
| Dashboard / card layout | `dashboard` preset |
| Accessible enterprise data table | `enterprise` preset (all 7 extensions) |
| Custom subset, programmatic control | `BundleBuilder` |
| Load-on-demand | `ExtensionLoader.lazyLoad(grid, path)` |

### `BundleLoader.recommendBundle(requirements)`

Pass a requirements object and get a recommendation back:

```js
const loader = new BundleLoader();
const rec = loader.recommendBundle({
    needsSorting: true,
    needsSearch: true,
    needsPagination: true,
    needsAccessibility: false,
    prioritizeSize: false,
});
// rec.bundle   → 'advanced'
// rec.preset   → 'table-focused'
// rec.features → ['layout-renderer', 'sorting', 'search', 'pagination']
```

---

## Rendering Performance

### Shadow DOM isolation

SwivelGrid renders inside a Shadow DOM. CSS from the host page does not reach grid cells unless you use CSS Custom Properties on `:host`. This is by design — it prevents style conflicts — but it means you cannot use global utility classes inside the grid.

To share design tokens:
```css
/* host page */
swivel-grid {
    --swivel-cell-padding: 12px;
    --swivel-header-bg: #f5f5f5;
}
```

Extensions that need to pass through host styles should use `grid.addExtensionStyles(css, id)`.

### `render()` is synchronous, full-replace

Every call to `render()` replaces the entire `shadowRoot.innerHTML`. Avoid calling it in loops or scroll handlers. Writes to `el.schema` and `el.rows` each trigger one `render()` call — if you need to set both, set `schema` first (its setter does not call `render()` alone; only the `rows` setter triggers a render).

Actually: both `schema` and `rows` setters call `render()`. If you are doing initial setup, use `Object.assign` / bracket assignment in sequence — the last assignment triggers the render that matters.

```js
// One render instead of two:
el._schema = processedSchema;   // bypass setter
el.rows = rowData;              // trigger single render
```

Or equivalently, just set both and accept two renders — it's only costly if you have thousands of rows.

### `appendData()` vs `setData()`

| Method | Behavior | When to use |
|---|---|---|
| `el.rows = newArray` | Full re-render | Replacing the whole dataset |
| `el.setData(newArray)` | Full re-render + resets pagination | Replacing dataset with pagination reset |
| `el.appendData(newRows)` | Incremental DOM patch (PaginationExtension) | Infinite scroll / appending pages |

`appendData` is provided by PaginationExtension and patches only the new rows into the existing `<tbody>`, avoiding a full re-render.

---

## When to Use Virtualization

Standard rendering inserts every row into the DOM. For large datasets this creates layout pressure and slows scrolling.

| Row count | Recommendation |
|---|---|
| < 500 | Standard rendering — no action needed |
| 500 – 5,000 | Consider `TableVirtualizer` or `GridVirtualizer` |
| > 5,000 | Virtualization required for acceptable scroll performance |

### TableVirtualizer

For `layoutType: 'table'` with fixed-height rows. Renders only the rows visible in the scroll container plus a small overscan buffer. Fastest option.

```js
import { TableVirtualizer } from './extensions/TableVirtualizer.js';

const virt = new TableVirtualizer({ rowHeight: 48, overscan: 5 });
el.registerExtension(virt);
```

### GridVirtualizer

For `layoutType: 'grid'` (card layout). Uses height estimation with a cache — first render measures card height and caches it for subsequent scroll calculations.

```js
import { GridVirtualizer } from './extensions/GridVirtualizer.js';

const virt = new GridVirtualizer({ estimatedRowHeight: 200, columns: 3 });
el.registerExtension(virt);
```

See [VIRTUALIZATION_GUIDE.md](VIRTUALIZATION_GUIDE.md) for configuration options, scroll event handling, and known limitations.

### jsdom limitation

Virtualizers depend on `getBoundingClientRect()` and scroll event geometry, which jsdom does not implement. Virtualization cannot be tested with Vitest + jsdom. Use browser-based testing (Playwright or Cypress) for virtualization scenarios.

---

## Extension Loading Performance

### Keep `onInitialize` lightweight

`registerExtension(ext)` runs `extension.initialize(grid)` synchronously on the main thread. Heavy work in `onInitialize` (DOM queries, large data processing) blocks the first paint. Defer to `onAfterRender` for any work that requires the DOM to be live.

### Lazy loading

Use `ExtensionLoader.lazyLoad` to defer loading an extension until it's actually needed:

```js
const loader = new ExtensionLoader();

// User clicks "Export" button → load the export extension on demand
button.addEventListener('click', async () => {
    await loader.lazyLoad(grid, './extensions/ExportExtension.js');
});
```

This uses dynamic `import()` — the extension module is not fetched until the call.

### Batched registration

`BundleBuilder.build()` instantiates all extensions but does not register them. You can delay registration until the grid is visible:

```js
const extensions = new BundleBuilder()
    .addFeature('sorting')
    .addFeature('pagination')
    .build();

// Register all at once when needed
const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
        extensions.forEach(ext => grid.registerExtension(ext));
        observer.disconnect();
    }
});
observer.observe(grid);
```

### `BundleBuilder.estimateSize()`

Before deciding which features to include, estimate the bundle cost:

```js
const estimate = new BundleBuilder()
    .addFeature('sorting')
    .addFeature('search')
    .addFeature('pagination')
    .estimateSize();

console.log(estimate.kb);           // 17
console.log(estimate.breakdown);    // { 'layout-renderer': 8, 'sorting': 4, ... }
```

Note: `layout-renderer` is auto-resolved as a dependency — it appears in the estimate even if not explicitly added.
