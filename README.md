# Swivel Grid

A framework-agnostic data grid built as a native Web Component (`<swivel-grid>`). Shows data as a card grid or a sortable table, with a hook-based extension system for adding features without touching the core.

**Live demo:** https://swivelgrid.thanish.com/

**Status:** v1, modular extension architecture, no dependencies, no build step. 439 tests passing.

## Installation

**npm / yarn / pnpm**
```sh
npm install swivel-grid
yarn add swivel-grid
pnpm add swivel-grid
```

**CDN**
```html
<!-- UMD — plain <script> tag, no module system needed -->
<script src="https://unpkg.com/swivel-grid/dist/swivel-grid.umd.cjs"></script>

<!-- ESM — type="module" -->
<script type="module">
  import { SwivelGrid } from 'https://unpkg.com/swivel-grid/dist/swivel-grid.esm.js';
  import { LayoutRendererExtension } from 'https://unpkg.com/swivel-grid/extensions/LayoutRendererExtension.js';
</script>
```

**Bundle Builder — single-file download (no package manager needed)**

Visit **[swivelgrid.thanish.com](https://swivelgrid.thanish.com)**, pick the extensions you need, and download a ready-to-use `.js` file. Good for prototypes, legacy setups, or any project without a bundler.

```html
<!-- After downloading from the builder -->
<script type="module" src="./swivel-grid-custom.js"></script>
```
```js
import { SwivelGrid, StandardBundle } from './swivel-grid-custom.js';
await StandardBundle.loadInto(document.querySelector('swivel-grid'));
```

**Quick start**
```js
import { SwivelGrid } from 'swivel-grid';
import { LayoutRendererExtension } from 'swivel-grid/extensions/LayoutRendererExtension';
import { SortingExtension } from 'swivel-grid/extensions/SortingExtension';

const grid = document.querySelector('swivel-grid');
grid.registerExtension(new LayoutRendererExtension());
grid.registerExtension(new SortingExtension());
grid.schema = [{ label: 'Name', key: 'name' }];
grid.rows = [{ name: 'Alice' }];
```

## Extension System

Every feature is an extension. Register what you need; leave out what you don't.

```js
grid.registerExtension(new SortingExtension());
grid.toggleExtension('sorting', false); // disable without removing
grid.swapExtension('sorting', newExt);  // hot-replace at runtime
```

→ Full method signatures in [API_REFERENCE.md](API_REFERENCE.md). Design details in [ARCHITECTURE.md](ARCHITECTURE.md).

## Bundle System

Load a curated set in one call, or compose your own.

```js
// Everything you need for a sortable data table
await StandardBundle.loadInto(grid);

// Pick exactly what you want — dependencies resolved automatically
const exts = new BundleBuilder().addFeature('sorting').addFeature('pagination').build();
exts.forEach(ext => grid.registerExtension(ext));
```

→ Use-case loading, presets, and the full BundleBuilder API in [BUNDLE_SYSTEM_GUIDE.md](BUNDLE_SYSTEM_GUIDE.md).

---

→ **Full API reference** (every method, property, event, schema field): [API_REFERENCE.md](API_REFERENCE.md)

---

## Quick start

Copy `SwivelGrid.js` into your project (not on npm yet).

```html
<swivel-grid id="products"></swivel-grid>
<script type="module" src="./SwivelGrid.js"></script>
<script type="module">
  const grid = document.querySelector('#products');

  grid.schema = [
    { label: 'Image',  key: 'image',  type: 'image', minWidth: '120px' },
    { label: 'Name',   key: 'name' },
    { label: 'Price',  key: 'price' },
    { label: 'Rating', key: 'rating', type: 'rating', sort: 'DESC' }
  ];

  grid.rows = [
    { image: 'https://example.com/a.jpg', name: 'Headphones', price: '$199.99', rating: '4/5' },
    { image: { src: 'https://example.com/b.jpg', alt: 'Shoes' }, name: 'Shoes', price: '$129.99', rating: { value: 5, max: 5 } }
  ];

  grid.layoutType = 'table';
</script>
```

Run the demo locally (needs Python 3):

```bash
npm start        # serves http://localhost:4400/demo.html
```

## Schema

Each object in `schema` describes one column.

| Field | Type | Notes |
|---|---|---|
| `key` | string | Property name to read from each row. Required. |
| `label` | string | Column header text. |
| `type` | `'rating'` \| `'image'` | **Deprecated** — use `cellTemplate` instead. Still works. |
| `sort` | `'ASC'` \| `'DESC'` | Initial sort direction. Only one column sorted at a time. |
| `sortable` | boolean | `false` disables header sorting. Default `true`. |
| `cellTemplate` | string | `{{value}}`-style template for the cell. See [Templates](#templates). |
| `headerTemplate` | string | Template for the header cell. |
| `headerClass`, `cellClass` | string | CSS class names added inside the Shadow DOM. |

**Rating values** can be `"4/5"`, `4` (out of 5), or `{ value: 4, max: 5 }`. Invalid values show `—`.  
**Image values** can be a URL string or `{ src, alt }`. Missing images show a placeholder.  
`null` or `undefined` cell values show `—`.

## Templates

Templates replace the default rendering of a header or cell. Use `{{ path }}` to insert a value.

```js
{
  label: 'Price', key: 'price',
  headerTemplate: '<b>{{label}}</b>',
  cellTemplate: '<span style="color:#28a745">{{value}}</span>'
}
```

| Template | Available variables |
|---|---|
| `cellTemplate` | `value`, `row`, `column` (e.g. `{{row.name}}`) |
| `headerTemplate` | `column`, `label` |

Built-in helpers: `{{renderRating(value)}}`, `{{renderImage(value)}}`, `{{formatDate(value)}}`, `{{formatNumber(value)}}`, `{{formatCurrency(value)}}`, `{{capitalize(value)}}`, `{{truncate(value, 50)}}`.

**Security:** interpolated values are always HTML-escaped. Template strings are treated as trusted, developer-written HTML — never build them from user input.

## Pagination and sorting

Set `pageSize` and `totalPages` when rows come from a server. When `totalPages` is set, clicking a column header updates the sort indicator and fires `swivel:sort` but does not sort locally — your handler fetches pre-sorted data from the server. Without `totalPages`, sorting happens client-side. For infinite scroll, listen for `swivel:pageThreshold` (fires at 80% scroll depth) and call `appendData(rows)` to patch in the next page without a full re-render.

→ Full method and event signatures in [API_REFERENCE.md](API_REFERENCE.md).

## Styling

Override these CSS custom properties on `swivel-grid`:

```css
swivel-grid {
  --primary-color: #007acc;
  --border-color: #e1e5e9;
  --hover-color: #f8f9fa;
  --text-color: #24292f;
  --star-color: #fbbf24;
}
```

The scroll area has a fixed `max-height` of 600px (400px under 768px wide).

## Known limitations

- No row virtualization by default: every loaded row is in the DOM. Use `TableVirtualizer` (fixed-height rows) or `GridVirtualizer` (card layout) for datasets over ~500 rows. Virtualizers require a real browser — jsdom does not implement scroll geometry. See [VIRTUALIZATION_GUIDE.md](VIRTUALIZATION_GUIDE.md).
- Each full render replaces the shadow DOM contents, so a re-sort resets scroll position and listeners are re-attached.
- `headerClass` and `cellClass` add class names inside the Shadow DOM. Page stylesheets cannot reach them — use templates with inline styles or the CSS custom properties above.
- Rows are not filtered by the grid: search only emits events and calls your handler.
- Extension system requires extension classes to be in global scope (`window` / `globalThis`) before bundle load methods are called.

## Project files

| File / Directory | Purpose |
|---|---|
| `SwivelGrid.js` | Core Web Component host (~846 lines). |
| `extensions/` | 7 built-in extensions + `BaseExtension` + `ExtensionLoader`. |
| `bundles/` | `StandardBundle`, `AdvancedBundle`, `BundleLoader`, `BundleBuilder`. |
| `tests/` | 22 test files, 439 tests (Vitest + jsdom). |
| `demo.html`, `data.js` | Demo page and sample data. |
| `API_REFERENCE.md` | Full API for every public method, property, and event. |
| `ARCHITECTURE.md` | Design decisions, extension lifecycle, author guide. |
| `BUNDLE_SYSTEM_GUIDE.md` | Bundle loading, presets, BundleBuilder, ExtensionLoader. |
| `PERFORMANCE_GUIDE.md` | Bundle size comparison, rendering tips, virtualization thresholds. |
| `VIRTUALIZATION_GUIDE.md` | TableVirtualizer and GridVirtualizer configuration. |
| `CHANGELOG.md` | Version history. |
| `ROADMAP.md` | Phase history and remaining work. |

## Credits and license

Designed and written by Tanish Alaparthi. Later revisions were pair-programmed with Claude Code, and this README was drafted with AI assistance and checked against the source.

MIT License. See [LICENSE](LICENSE).
