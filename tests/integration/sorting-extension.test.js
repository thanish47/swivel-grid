import { describe, it, expect, vi } from 'vitest';
import { createGrid } from '../setup.js';

const schema = [
    { key: 'name',  label: 'Name',  sortable: true },
    { key: 'price', label: 'Price', sortable: true },
    { key: 'fixed', label: 'Fixed', sortable: false },
];

const rows = [
    { name: 'Banana', price: 3 },
    { name: 'Apple',  price: 1 },
    { name: 'Cherry', price: 2 },
];

function getSortExt(el) {
    return el.getExtension('sorting');
}

function getHeader(el, key) {
    return el.shadowRoot.querySelector(`th[data-key="${key}"]`);
}

// ─── Click-to-sort ────────────────────────────────────────────────────────────

describe('SortingExtension click-to-sort', () => {
    it('fires swivel:sort when a sortable header is clicked', () => {
        const el = createGrid(schema, rows, { layoutType: 'table' });
        const events = [];
        el.addEventListener('swivel:sort', e => events.push(e));

        getHeader(el, 'name').click();

        expect(events).toHaveLength(1);
    });

    it('first click sets direction to ASC', () => {
        const el = createGrid(schema, rows, { layoutType: 'table' });
        const events = [];
        el.addEventListener('swivel:sort', e => events.push(e));

        getHeader(el, 'name').click();

        expect(events[0].detail.direction).toBe('ASC');
    });

    it('second click on same header toggles to DESC', () => {
        const el = createGrid(schema, rows, { layoutType: 'table' });
        const events = [];
        el.addEventListener('swivel:sort', e => events.push(e));

        getHeader(el, 'name').click();
        getHeader(el, 'name').click();

        expect(events[1].detail.direction).toBe('DESC');
    });

    it('does NOT fire swivel:sort on non-sortable column', () => {
        const el = createGrid(schema, rows, { layoutType: 'table' });
        const events = [];
        el.addEventListener('swivel:sort', e => events.push(e));

        getHeader(el, 'fixed').click();

        expect(events).toHaveLength(0);
    });

    it('actually re-orders rows in _rows on click', () => {
        const el = createGrid(schema, rows, { layoutType: 'table' });
        getHeader(el, 'name').click(); // ASC

        expect(el._rows[0].name).toBe('Apple');
        expect(el._rows[1].name).toBe('Banana');
        expect(el._rows[2].name).toBe('Cherry');
    });
});

// ─── Keyboard sort ────────────────────────────────────────────────────────────

describe('SortingExtension keyboard sort', () => {
    it('fires swivel:sort on Enter key', () => {
        const el = createGrid(schema, rows, { layoutType: 'table' });
        const events = [];
        el.addEventListener('swivel:sort', e => events.push(e));

        const th = getHeader(el, 'price');
        th.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

        expect(events).toHaveLength(1);
    });

    it('fires swivel:sort on Space key', () => {
        const el = createGrid(schema, rows, { layoutType: 'table' });
        const events = [];
        el.addEventListener('swivel:sort', e => events.push(e));

        const th = getHeader(el, 'price');
        th.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));

        expect(events).toHaveLength(1);
    });
});

// ─── getSortClass ─────────────────────────────────────────────────────────────

describe('SortingExtension.getSortClass', () => {
    it('returns "sortable" for a sortable unsorted column', () => {
        const ext = new SortingExtension();
        const cls = ext.getSortClass({ sortable: true, sort: null });
        expect(cls).toContain('sortable');
        expect(cls).not.toContain('sort-asc');
        expect(cls).not.toContain('sort-desc');
    });

    it('returns "sortable sort-asc" for ASC column', () => {
        const ext = new SortingExtension();
        const cls = ext.getSortClass({ sortable: true, sort: 'ASC' });
        expect(cls).toContain('sort-asc');
    });

    it('returns "sortable sort-desc" for DESC column', () => {
        const ext = new SortingExtension();
        const cls = ext.getSortClass({ sortable: true, sort: 'DESC' });
        expect(cls).toContain('sort-desc');
    });

    it('returns empty string for non-sortable column with no sort', () => {
        const ext = new SortingExtension();
        const cls = ext.getSortClass({ sortable: false, sort: null });
        expect(cls.trim()).toBe('');
    });
});

// ─── sortHandler callback ─────────────────────────────────────────────────────

describe('SortingExtension.sortHandler', () => {
    it('calls sortHandler callback with key and direction', () => {
        const el = createGrid(schema, rows, { layoutType: 'table' });
        const handler = vi.fn();
        el.sortHandler = handler;

        getHeader(el, 'name').click();

        expect(handler).toHaveBeenCalledWith({ key: 'name', direction: 'ASC' });
    });
});

// ─── Custom comparator ────────────────────────────────────────────────────────

describe('SortingExtension custom comparator', () => {
    it('uses customSort function from schema column when provided', () => {
        const callLog = [];
        const schemaWithCustom = [
            {
                key: 'name',
                label: 'Name',
                sortable: true,
                sortComparator: (a, b) => {
                    callLog.push([a, b]);
                    return 0;
                }
            }
        ];
        const el = createGrid(schemaWithCustom, rows, { layoutType: 'table' });

        getHeader(el, 'name').click();

        expect(callLog.length).toBeGreaterThan(0);
    });
});
