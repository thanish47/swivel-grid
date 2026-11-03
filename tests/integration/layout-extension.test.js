import { describe, it, expect } from 'vitest';
import { createGrid, createGridWithExtensions } from '../setup.js';

const schema = [
    { key: 'name', label: 'Name' },
    { key: 'price', label: 'Price' },
];
const rows = [
    { name: 'Alpha', price: 10 },
    { name: 'Beta',  price: 20 },
    { name: 'Gamma', price: 5  },
];

function getTable(el) {
    return el.shadowRoot.querySelector('table');
}

function getTh(el) {
    return Array.from(el.shadowRoot.querySelectorAll('th'));
}

function getTr(el) {
    return Array.from(el.shadowRoot.querySelectorAll('tbody tr'));
}

// ─── renderAppendedRows ───────────────────────────────────────────────────────

describe('LayoutRendererExtension.renderAppendedRows', () => {
    it('appends rows to tbody without full re-render', () => {
        const el = createGrid(schema, [rows[0]], { layoutType: 'table' });
        const layoutExt = el.getExtension('layout-renderer');
        expect(getTr(el)).toHaveLength(1);

        layoutExt.renderAppendedRows([rows[1], rows[2]], 'table', el._schema);

        expect(getTr(el)).toHaveLength(3);
    });

    it('renders correct cell values for appended rows', () => {
        const el = createGrid(schema, [rows[0]], { layoutType: 'table' });
        const layoutExt = el.getExtension('layout-renderer');

        layoutExt.renderAppendedRows([{ name: 'Delta', price: 99 }], 'table', el._schema);

        const lastRow = getTr(el).at(-1);
        expect(lastRow.textContent).toContain('Delta');
        expect(lastRow.textContent).toContain('99');
    });

    it('does not throw when tbody does not exist (empty grid)', () => {
        const el = createGrid(schema, [], { layoutType: 'table' });
        const layoutExt = el.getExtension('layout-renderer');
        // Empty table may not have a tbody — should be a no-op
        expect(() => layoutExt.renderAppendedRows([rows[0]], 'table', el._schema)).not.toThrow();
    });
});

// ─── Sticky-header DOM structure ─────────────────────────────────────────────

describe('LayoutRendererExtension sticky header DOM', () => {
    it('renders inside .sticky-table-wrapper', () => {
        const el = createGrid(schema, rows, { layoutType: 'table' });
        expect(el.shadowRoot.querySelector('.sticky-table-wrapper')).not.toBeNull();
    });

    it('renders header table inside .sticky-table-header', () => {
        const el = createGrid(schema, rows, { layoutType: 'table' });
        const headerContainer = el.shadowRoot.querySelector('.sticky-table-header');
        expect(headerContainer).not.toBeNull();
        expect(headerContainer.querySelector('table')).not.toBeNull();
    });

    it('renders body table inside .sticky-table-container', () => {
        const el = createGrid(schema, rows, { layoutType: 'table' });
        const bodyContainer = el.shadowRoot.querySelector('.sticky-table-container');
        expect(bodyContainer).not.toBeNull();
        expect(bodyContainer.querySelector('table')).not.toBeNull();
    });
});

// ─── Grid layout ─────────────────────────────────────────────────────────────

describe('LayoutRendererExtension grid layout', () => {
    it('renders .grid-container with layoutType=grid', () => {
        const el = createGrid(schema, rows, { layoutType: 'grid' });
        expect(el.shadowRoot.querySelector('.grid-container')).not.toBeNull();
    });

    it('grid card contains field labels', () => {
        const el = createGrid(schema, rows, { layoutType: 'grid' });
        const firstCard = el.shadowRoot.querySelector('.grid-card');
        expect(firstCard.textContent).toContain('Name');
    });

    it('renders one .grid-card per row', () => {
        const el = createGrid(schema, rows, { layoutType: 'grid' });
        expect(el.shadowRoot.querySelectorAll('.grid-card')).toHaveLength(rows.length);
    });
});

// ─── Fallback stub (no LayoutRendererExtension) ───────────────────────────────

describe('LayoutRendererExtension fallback stub', () => {
    it('renders a warning message when layout-renderer is not loaded', () => {
        const el = createGridWithExtensions(schema, rows, []);
        const text = el.shadowRoot.innerHTML;
        expect(text).toMatch(/layout|extension|stub/i);
    });
});

// ─── CellClass rendering ─────────────────────────────────────────────────────

describe('LayoutRendererExtension cellClass', () => {
    it('wraps cell content in <span> with sanitized class', () => {
        const schemaWithClass = [{ key: 'name', label: 'Name', cellClass: 'highlight' }];
        const el = createGrid(schemaWithClass, [{ name: 'Foo' }], { layoutType: 'table' });
        const cell = el.shadowRoot.querySelector('tbody td');
        expect(cell.innerHTML).toContain('class="highlight"');
    });
});
