import { describe, it, expect } from 'vitest';
import { createGrid } from '../setup.js';

const schema = [
    { key: 'name', label: 'Name' },
    { key: 'price', label: 'Price' },
];

// Use a factory so each test gets a fresh array (rows setter stores the reference)
function makeInitialRows() {
    return [
        { name: 'Alpha', price: 10 },
        { name: 'Beta', price: 20 },
    ];
}

// ─── setData ─────────────────────────────────────────────────────────────────

describe('setData', () => {
    it('replaces _rows completely', () => {
        const el = createGrid(schema, makeInitialRows(), { layoutType: 'table' });
        el.setData([{ name: 'Only', price: 99 }]);
        expect(el._rows).toHaveLength(1);
        expect(el._rows[0].name).toBe('Only');
    });

    it('resets _currentPage to 1', () => {
        const el = createGrid(schema, makeInitialRows());
        el._currentPage = 5;
        el.setData([{ name: 'X', price: 1 }]);
        expect(el._currentPage).toBe(1);
    });

    it('re-renders — DOM row count matches new data length', () => {
        const el = createGrid(schema, makeInitialRows(), { layoutType: 'table' });
        el.setData([{ name: 'One', price: 1 }, { name: 'Two', price: 2 }, { name: 'Three', price: 3 }]);
        expect(el.shadowRoot.querySelectorAll('tbody tr')).toHaveLength(3);
    });

    it('handles empty array input', () => {
        const el = createGrid(schema, makeInitialRows());
        el.setData([]);
        expect(el._rows).toEqual([]);
    });

    it('handles non-array input (falls back to empty)', () => {
        const el = createGrid(schema, makeInitialRows());
        el.setData('not-an-array');
        expect(el._rows).toEqual([]);
    });

    it('stores a copy — mutating the original array does not affect _rows', () => {
        const el = createGrid(schema, makeInitialRows());
        const newData = [{ name: 'X', price: 1 }];
        el.setData(newData);
        newData.push({ name: 'Y', price: 2 });
        expect(el._rows).toHaveLength(1);
    });
});

// ─── appendData ──────────────────────────────────────────────────────────────

describe('appendData', () => {
    it('adds rows to existing _rows', () => {
        const el = createGrid(schema, makeInitialRows(), { layoutType: 'table' });
        const before = el._rows.length; // 2
        el.appendData([{ name: 'Gamma', price: 30 }]);
        expect(el._rows).toHaveLength(before + 1);
    });

    it('appends rows to DOM without full re-render (tbody grows)', () => {
        const el = createGrid(schema, makeInitialRows(), { layoutType: 'table' });
        const before = el.shadowRoot.querySelectorAll('tbody tr').length;
        el.appendData([{ name: 'Gamma', price: 30 }]);
        expect(el.shadowRoot.querySelectorAll('tbody tr')).toHaveLength(before + 1);
    });

    it('is a no-op for empty array', () => {
        const el = createGrid(schema, makeInitialRows());
        const before = el._rows.length;
        el.appendData([]);
        expect(el._rows).toHaveLength(before);
    });

    it('is a no-op for non-array input', () => {
        const el = createGrid(schema, makeInitialRows());
        const before = el._rows.length;
        el.appendData('not-array');
        expect(el._rows).toHaveLength(before);
    });

    it('appends multiple rows at once', () => {
        const el = createGrid(schema, makeInitialRows(), { layoutType: 'table' });
        const before = el._rows.length;
        el.appendData([{ name: 'C', price: 3 }, { name: 'D', price: 4 }]);
        expect(el._rows).toHaveLength(before + 2);
    });
});

// ─── setPageData ─────────────────────────────────────────────────────────────

describe('setPageData', () => {
    it('appends data as a new page when no pageNumber given', () => {
        const el = createGrid(schema, makeInitialRows());
        const before = el._rows.length;
        el.setPageData([{ name: 'P2', price: 50 }]);
        expect(el._rows).toHaveLength(before + 1);
    });

    it('replaces page data at given pageNumber', () => {
        const el = createGrid(schema, []);
        el._pageSize = 2;
        el.setPageData([{ name: 'A', price: 1 }, { name: 'B', price: 2 }], 1);
        expect(el._rows).toHaveLength(2);
        expect(el._rows[0].name).toBe('A');
    });

    it('clears _loading flag after update', () => {
        const el = createGrid(schema, makeInitialRows());
        el._loading = true;
        el.setPageData([{ name: 'X', price: 1 }]);
        expect(el._loading).toBe(false);
    });

    it('is a no-op for non-array input', () => {
        const el = createGrid(schema, makeInitialRows());
        const before = el._rows.length;
        el.setPageData('bad');
        expect(el._rows).toHaveLength(before);
    });
});
