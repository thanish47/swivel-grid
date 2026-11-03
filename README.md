# Swivel Grid

A framework-agnostic data grid built as a native Web Component (`<swivel-grid>`). It shows the same data as either a card grid or a table, with sorting, external search binding, custom cell templates, and scroll-driven pagination hooks.

**Live demo:** https://swivelgrid.thanish.com/

**Status:** v1, single file, no dependencies, no build step. It renders all loaded rows (no virtualization yet), so it is best suited to a few thousand rows or fewer. See [Known limitations](#known-limitations) and [ROADMAP.md](ROADMAP.md).

## Features

- **Two layouts, switchable at runtime:** card grid or table (`layout-type="grid" | "table"`; `"list"` is an alias for `"table"`).
- **Sorting:** click a header, or press Enter or Space on it, to toggle ASC/DESC. One column is sorted at a time. Custom comparators are supported per column.
- **Column types:** text (default, HTML-escaped), `rating` and `image`.
- **Templates:** `headerTemplate` and `cellTemplate` with `{{ value }}`-style interpolation. Interpolated values are HTML-escaped.
- **External search input:** point `search-input` at any input by CSS selector. The grid emits events and calls your handler; it does not filter rows itself.
- **Pagination hooks:** page-change events, an 80% scroll threshold, and a `loadMoreCallback` for server-driven loading.
- **Accessibility basics:** `aria-sort` on headers, keyboard-operable sorting, screen-reader text for ratings, list roles in grid layout.
- **Shadow DOM:** styles are encapsulated. Theme it with CSS custom properties.

## Quick start

Copy `SwivelGrid.js` into your project (it is not published to npm yet).

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

## Schema (columns)

| Field | Type | Notes |
|---|---|---|
| `label` | string | Column title (HTML-escaped). |
| `key` | string | Property name to read from each row. |
| `type` | `'rating'` \| `'image'` | Omit for text. |
| `minWidth`, `maxWidth` | CSS length | Applied to header and cells in table layout. In grid layout, the largest `px` `minWidth` sets the minimum card width. |
| `sort` | `'ASC'` \| `'DESC'` | Initial sort. Only one column can be sorted; if several are set, the first wins. |
| `sortable` | boolean | `false` disables header sorting (default `true`). |
| `sortComparator` | `(a, b, rowA, rowB) => number` | Overrides the default comparison. |
| `headerTemplate`, `cellTemplate` | string | See [Templates](#templates). |
| `headerClass`, `cellClass` | string | Class names added to the default rendering only. See limitations. |

**Rating values** can be `"4/5"`, `4` (out of 5), or `{ value: 4, max: 5 }`. Invalid values show `—`.
**Image values** can be a URL string or `{ src, alt }`. Missing or failed images show a placeholder. In grid layout the image column is shown at the top of the card.
`null` or `undefined` cell values show `—`.

## Attributes and properties

Attributes take JSON strings; properties take real values. If a property has been set, later attribute changes for it are ignored.

| Attribute | Property | Default |
|---|---|---|
| `schema` | `schema` | `[]` |
| `rows` | `rows` | `[]` |
| `layout-type` | `layoutType` | `'grid'` |
| `search-input` | `searchInput` (CSS selector) | `null` |

Additional properties (no attribute form): `sortHandler`, `searchHandler`, `pageUpHandler`, `pageDownHandler`, `pageSize` (default 100), `totalPages`, `loading`, `loadMoreCallback`.

## Methods

| Method | Behavior |
|---|---|
| `setData(rows)` | Replace all rows, reset to page 1, re-render. |
| `appendData(rows)` | Append rows. Re-sorts if a sort is active and `totalPages` is not set; otherwise appends without re-sorting. |
| `setPageData(data, pageNumber?)` | With `pageNumber`, replace that page's slice (gaps are filled with empty rows). Without it, append as the next page. |
| `render()` | Force a re-render. |
| `destroy()` | Remove the search and scroll listeners. Also runs automatically on disconnect. |

## Events

All events bubble and are composed, so they cross the Shadow DOM boundary. Each also has a matching handler property where noted.

| Event | `detail` | Handler property |
|---|---|---|
| `swivel:sort` | `{ key, direction }` | `sortHandler` |
| `swivel:search` | `{ query }` | `searchHandler` |
| `swivel:data` | `{ type: 'set' \| 'append' \| 'page-set' \| 'page-append', length, ... }` | none |
| `swivel:pageDown` | `{ pageNumber }` | `pageDownHandler` (receives the page number) |
| `swivel:pageUp` | `{ pageNumber }` | `pageUpHandler` (receives the page number) |
| `swivel:pageThreshold` | `{ pageNumber, threshold: 0.8, nextPage }` | none |

## Pagination and sorting

Set `pageSize` and `totalPages` when rows come from a server.

- When the user has scrolled through 80% of the current page, the grid fires `swivel:pageThreshold` and, if `loadMoreCallback` is set, sets `loading = true` and calls it. Your code should fetch the next page, then call `setPageData(data)` (which clears `loading`).
- **When `totalPages` is set, the grid does not sort locally.** Clicking a header updates the sort indicator and calls `sortHandler`; you must re-fetch sorted data from your server. This avoids mixing sorted and unsorted pages.
- Without `totalPages`, sorting happens client-side on the rows you have loaded.

```js
grid.pageSize = 50;
grid.totalPages = 20;
grid.loadMoreCallback = async () => {
  const next = Math.ceil(grid.rows.length / grid.pageSize) + 1;
  grid.setPageData(await fetchPage(next));
};
grid.sortHandler = ({ key, direction }) => reloadFromServer(key, direction);
```

## Templates

Templates replace the default rendering of a header or cell. Use `{{ path }}` to insert a value; dotted paths work.

```js
{
  label: 'Price', key: 'price',
  headerTemplate: '<b>{{label}}</b>',
  cellTemplate: '<span style="color:#28a745">{{value}}</span>'
}
```

| Template | Available variables |
|---|---|
| `cellTemplate` | `value`, `row`, `column`, `isGridImage` (for example `{{row.name}}`) |
| `headerTemplate` | `column`, `label`, `isGridLabel` |

**Security model:** interpolated values are always HTML-escaped. The template string itself is treated as **trusted, developer-written HTML**. The grid applies a best-effort filter that strips a few dangerous patterns (such as `<script>`, `javascript:` and inline event handlers), but this is not a sanitizer. Never build templates from user input.

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

- No row virtualization: every loaded row is in the DOM, and scroll tracking measures rows on each animation frame.
- Each full render replaces the shadow DOM contents, so a re-sort resets scroll position and listeners are re-attached.
- `headerClass` and `cellClass` add class names inside the Shadow DOM. Page stylesheets cannot reach them, so use templates with inline styles or the CSS custom properties above.
- Rows are not filtered by the grid: search only emits events and calls your handler.
- No automated tests or CI yet.
- Not published to npm.

## Project files

| File | Purpose |
|---|---|
| `SwivelGrid.js` | The component (about 1,260 lines). |
| `demo.html`, `data.js` | Demo page and sample data. |
| `ROADMAP.md` | Planned modularization (not implemented). |

## Credits and license

Designed and written by Tanish Alaparthi. Later revisions were pair-programmed with Claude Code, and this README was drafted with AI assistance and checked against the source.

MIT License. See [LICENSE](LICENSE).
