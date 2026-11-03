# SwivelGrid Architecture

How SwivelGrid is designed, why it was designed that way, and what an extension author needs to know.

---

## Why Micro-Core

The original `SwivelGrid.js` was 1,265 lines. Rendering, sorting, search, pagination, template processing, accessibility, and CSS class injection were all mixed in a single class. Every feature added more private methods and more render-path conditionals.

The refactoring goal was a **micro-core**: a host that handles exactly three things:
1. Web Component lifecycle (`connectedCallback`, `attributeChangedCallback`)
2. Extension registration and hook execution
3. The render loop itself

Everything else — how HTML is built, how data is sorted, how pages are sized — lives in extensions. The core stays small and stable; extensions can be added, replaced, or removed without touching the core.

The current core (`SwivelGrid.js`) is 846 lines. It exceeds the 400-line target because it retains delegate fallbacks for cases where extensions are not loaded (graceful degradation). This is intentional: a `<swivel-grid>` with no extensions registered still renders a basic table from `schema` and `rows`.

---

## Core Architecture

```
SwivelGrid (Web Component, Shadow DOM host)
 │
 ├── _extensions: Map<name → BaseExtension>
 │
 ├── _extensionHooks:
 │    ├── beforeRender: [ext, ext, ...]   ← sorted by priority ASC
 │    └── afterRender:  [ext, ext, ...]   ← sorted by priority ASC
 │
 └── render()
      │
      ├── 1. Build initial context from current state
      │        { schema, rows, layoutType, searchInput, layoutHTML: '' }
      │
      ├── 2. Run each beforeRender hook in priority order
      │        context = hook(context)      ← must return context
      │        (LayoutRendererExtension sets context.layoutHTML here)
      │
      ├── 3. shadowRoot.innerHTML = context.layoutHTML
      │
      └── 4. Run each afterRender hook in priority order
               hook(context, shadowRoot)    ← DOM is live
```

---

## Extension Lifecycle

```
grid.registerExtension(ext)
  │
  ├── extension.initialize(grid)          ← onInitialize(grid) fires
  ├── insert into beforeRender hooks (priority order)
  └── insert into afterRender hooks (priority order)
          │
          │  ... renders happen ...
          │
          ├── render() calls beforeRender hooks  ← onBeforeRender(context) fires
          └── render() calls afterRender hooks   ← onAfterRender(context, el) fires

grid.unregisterExtension(name)
  │
  ├── extension.destroy()                 ← onDestroy() fires
  ├── remove from beforeRender hooks
  └── remove from afterRender hooks
```

### Priority System

Lower priority number = earlier execution.

| Extension | Priority | Reason |
|-----------|----------|--------|
| PaginationExtension | 5 | Injects `pageSize`/`totalPages` setters onto the grid before schema is processed |
| LayoutRendererExtension | 10 | **Must run first in render** — sets `context.layoutHTML`; all other extensions depend on this |
| TemplateExtension | 20 | Processes `cellTemplate`/`headerTemplate` in schema before layout is built |
| SortingExtension | 30 | Reads schema sort state; attaches click listeners in `afterRender` |
| SearchExtension | 40 | Binds to the external search input after render |
| CssClassesExtension | 50 | Applies `cellClass`/`headerClass`/`rowClass` to already-rendered cells |
| AccessibilityExtension | 100 | Adds ARIA attributes to the fully-rendered DOM last |

If LayoutRendererExtension does not run before SortingExtension, `context.layoutHTML` would be empty when sorting tries to attach column listeners. The priority ordering enforces this contract without coupling the extensions directly.

---

## Hook Context Object

`beforeRender` hooks receive and **must return** a context object:

```js
{
  schema:      Array,   // column definitions after TemplateExtension processing
  rows:        Array,   // current row data (may be filtered/paginated by hooks)
  layoutType:  string,  // 'grid' | 'table'
  searchInput: string,  // CSS selector for the bound search element (or null)
  layoutHTML:  string   // empty string initially; LayoutRendererExtension writes here
}
```

**Contract:** a hook that does not need to change context must still `return context`. Returning `undefined` or `null` breaks every subsequent hook.

Hooks may add their own keys to context for downstream hooks to read. For example, PaginationExtension adds `pageSize` and `currentPage` to context so LayoutRendererExtension can render the correct page of rows.

---

## Bundle Architecture

```
 SwivelGrid (core)
      ↑
 BaseExtension (lifecycle contract)
      ↑
 Individual extensions  (LayoutRendererExtension, SortingExtension, ...)
      ↑
 Bundles  (StandardBundle, AdvancedBundle)
      ↑
 BundleLoader  (use-case routing, config-based loading)
      ↑
 BundleBuilder  (programmatic composition, presets, serialization)
```

**StandardBundle** — instantiates and registers `LayoutRendererExtension`, `TemplateExtension`, `SortingExtension`.

**AdvancedBundle** — instantiates and registers all 7 extensions in priority order. Provides `getPresets()` for named subsets and `loadSubsetInto(grid, names[])` for partial loads.

**BundleLoader** — orchestrates which bundle or preset to load based on a use-case string (`'data-table'`, `'enterprise'`, etc.). All async methods return `{ success, loadedExtensions, errors }`.

**BundleBuilder** — lets you compose a custom extension set programmatically:
```js
const exts = new BundleBuilder()
    .addFeature('sorting')
    .addFeature('pagination')
    .build();  // resolves layout-renderer dep automatically
```

`build()` instantiates extension classes from global scope (same pattern as the bundles themselves). This means extension classes must be available on `globalThis` / `window` at build time.

---

## Backward Compatibility Design

### `column.type` deprecation

The original API used `column.type: 'rating'` and `column.type: 'image'`. After the refactoring, this logic lives in `TemplateExtension`. The core `LayoutRendererExtension` detects `column.type` values, emits a `console.warn`, and delegates to `TemplateExtension`'s render helpers. Existing schemas continue to work without migration.

The migration guide (`COLUMN_TYPES_TO_TEMPLATES_MIGRATION.md`) documents how to replace `type` with `cellTemplate`.

### Attribute vs. property precedence

Observed attributes (`layout-type`, `schema`, `rows`, `search-input`) are only applied in `attributeChangedCallback` when the corresponding property has not already been set programmatically. The `_propSet` map (keyed by property name) tracks this: once a property setter is called, the flag is true and attribute changes are ignored for that property.

This prevents a declarative attribute from clobbering a programmatic assignment that happened after the element was stamped into the DOM.

### PaginationExtension method injection

`PaginationExtension.initialize(grid)` injects `appendData`, `setPageData`, `pageSize` setter, and `totalPages` setter directly onto the grid instance. This preserves the flat API surface (`grid.pageSize = 10`) that predates the extension system. Applications written against the old API continue to work if PaginationExtension is loaded.

---

## Extension Author Guide

### Minimal skeleton

```js
class MyExtension extends BaseExtension {
    constructor() {
        super('my-extension');
        this.priority = 75; // run after CssClasses (50), before Accessibility (100)
    }

    onInitialize(grid) {
        // One-time setup. Store references, inject styles.
        grid.addExtensionStyles(`
            .my-highlight { background: yellow; }
        `, 'my-extension');
    }

    onAfterRender(context, root) {
        // DOM is live here — attach listeners, modify elements.
        root.querySelectorAll('td').forEach(td => {
            td.classList.add('my-highlight');
        });
    }

    onDestroy() {
        // Remove styles; event listeners registered via grid.addExtensionEventListener
        // are cleaned up automatically.
        this.getGrid().removeExtensionStyles('my-extension');
    }
}
```

### `onBeforeRender` vs `onAfterRender`

Use `onBeforeRender` when you need to:
- Modify `context.rows` (filter, sort, paginate)
- Modify `context.schema` (add computed columns)
- Set `context.layoutHTML` (if you're a renderer)

Use `onAfterRender` when you need to:
- Read or mutate DOM nodes (`shadowRoot` is live)
- Attach event listeners to rendered elements
- Apply CSS classes to cells

### Injecting styles

```js
// In onInitialize:
grid.addExtensionStyles('.my-ext { color: red; }', 'my-extension');
```

The second argument is an ID — `addExtensionStyles` replaces any existing style with the same ID, so calling it multiple times is safe.

### Dispatching events

```js
// Inside any hook:
this.dispatchEvent('selected', { rowId: row.id });
// → dispatches 'swivel:selected' on the grid element (bubbles, composed)
```

Listen from outside:
```js
grid.addEventListener('swivel:selected', e => console.log(e.detail.rowId));
```

### Naming and priority recommendations

- Extension `name`: kebab-case, unique within a grid instance
- Priorities 1–9: reserved for infrastructure (Pagination uses 5)
- Priorities 10–19: renderers
- Priorities 20–49: data transformers (Templates, Sorting)
- Priorities 50–89: DOM decorators (CssClasses)
- Priorities 90–99: a11y and telemetry
- Priority 0 (default): runs before everything — avoid unless intentional

### Accessing grid state

```js
const state = this.getGridState();
// { schema, rows, layoutType, searchInput, loading, currentPage, pageSize, totalPages }
```

`getGridState()` reads live values from the grid at the moment it's called. Use it in `onAfterRender` to inspect pagination or sort state without coupling your extension to the internals of other extensions.
