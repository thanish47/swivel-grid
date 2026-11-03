import { describe, it, expect } from 'vitest';
import { createGrid } from '../setup.js';

const schema = [{ key: 'name', label: 'Name' }, { key: 'price', label: 'Price' }];
const rows = [{ name: 'Alpha', price: 10 }, { name: 'Beta', price: 20 }];

// ─── Attribute-based initialization ──────────────────────────────────────────

describe('Attribute-based schema and rows', () => {
    it('parses schema from JSON attribute', () => {
        const el = document.createElement('swivel-grid');
        el.setAttribute('schema', JSON.stringify(schema));
        document.body.appendChild(el);

        expect(el._schema).toHaveLength(2);
        expect(el._schema[0].key).toBe('name');
    });

    it('parses rows from JSON attribute', () => {
        const el = document.createElement('swivel-grid');
        el.setAttribute('rows', JSON.stringify(rows));
        document.body.appendChild(el);

        expect(el._rows).toHaveLength(2);
    });

    it('renders table when both schema and rows attributes are set', () => {
        const el = document.createElement('swivel-grid');
        document.body.appendChild(el);
        el.registerExtension(new LayoutRendererExtension());
        el.registerExtension(new TemplateExtension());
        el.registerExtension(new SortingExtension());
        el.setAttribute('layout-type', 'table');
        el.setAttribute('schema', JSON.stringify(schema));
        el.setAttribute('rows', JSON.stringify(rows));

        expect(el.shadowRoot.querySelector('table')).not.toBeNull();
    });
});

// ─── Property precedence over attribute ───────────────────────────────────────

describe('Property precedence over attributes', () => {
    it('property assignment overrides attribute value', () => {
        const el = document.createElement('swivel-grid');
        el.setAttribute('schema', JSON.stringify([{ key: 'attr-col', label: 'Attr' }]));
        document.body.appendChild(el);

        el.schema = schema;

        expect(el._schema[0].key).toBe('name');
    });
});

// ─── layout-type attribute ────────────────────────────────────────────────────

describe('layout-type attribute switching', () => {
    it('sets _layoutType to "grid" from attribute', () => {
        const el = document.createElement('swivel-grid');
        el.setAttribute('layout-type', 'grid');
        document.body.appendChild(el);

        expect(el._layoutType).toBe('grid');
    });

    it('switches layout when layout-type attribute changes', () => {
        const el = createGrid(schema, rows);
        el.setAttribute('layout-type', 'grid');

        expect(el.shadowRoot.querySelector('.grid-container')).not.toBeNull();
    });

    it('switches to table layout when layout-type attribute is set to "table" (no prior property)', () => {
        // Start without setting layoutType property so attribute changes are honoured
        const el = document.createElement('swivel-grid');
        document.body.appendChild(el);
        el.registerExtension(new LayoutRendererExtension());
        el.registerExtension(new TemplateExtension());
        el.registerExtension(new SortingExtension());
        el.setAttribute('layout-type', 'table');
        el.schema = schema;
        el.rows = [...rows];

        expect(el.shadowRoot.querySelector('table')).not.toBeNull();
    });
});

// ─── setData still works ──────────────────────────────────────────────────────

describe('setData backward compatibility', () => {
    it('replaces rows and re-renders', () => {
        const el = createGrid(schema, rows, { layoutType: 'table' });
        el.setData([{ name: 'Only', price: 99 }]);
        expect(el.shadowRoot.querySelectorAll('tbody tr')).toHaveLength(1);
    });

    it('accepts empty array', () => {
        const el = createGrid(schema, rows);
        el.setData([]);
        expect(el._rows).toHaveLength(0);
    });
});

// ─── sortHandler / searchHandler ─────────────────────────────────────────────

describe('sortHandler and searchHandler backward compatibility', () => {
    it('setting non-function sortHandler stores null', () => {
        const el = createGrid(schema, rows);
        el.sortHandler = 'not-a-function';
        expect(el._sortHandler).toBeNull();
    });

    it('setting function sortHandler stores it', () => {
        const el = createGrid(schema, rows);
        const fn = () => {};
        el.sortHandler = fn;
        expect(el._sortHandler).toBe(fn);
    });

    it('setting non-function searchHandler stores null', () => {
        const el = createGrid(schema, rows);
        el.searchHandler = 123;
        expect(el._searchHandler).toBeNull();
    });
});

// ─── appendData and setPageData still accessible on el ───────────────────────

describe('appendData / setPageData accessible on grid element', () => {
    it('el.appendData is a function after extension registration', () => {
        const el = createGrid(schema, rows);
        expect(typeof el.appendData).toBe('function');
    });

    it('el.setPageData is a function after extension registration', () => {
        const el = createGrid(schema, rows);
        expect(typeof el.setPageData).toBe('function');
    });
});

// ─── Empty state ──────────────────────────────────────────────────────────────

describe('Empty state backward compatibility', () => {
    it('renders empty state when no rows provided', () => {
        const el = createGrid(schema, []);
        expect(el.shadowRoot.querySelector('.empty-state')).not.toBeNull();
    });

    it('renders empty state when no schema provided', () => {
        const el = createGrid([], []);
        expect(el.shadowRoot.innerHTML).not.toBe('');
    });
});
