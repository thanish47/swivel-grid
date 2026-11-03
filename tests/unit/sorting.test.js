import { describe, it, expect, beforeEach } from 'vitest';

let el;
let sortExt;

function makeMockGrid(schema, rows = []) {
    return {
        _schema: schema,
        _rows: rows,
        getExtension: () => null,
    };
}

beforeEach(() => {
    el = document.createElement('swivel-grid');
    sortExt = new SortingExtension();
});

// ─── getSortClass ─────────────────────────────────────────────────────────────

describe('getSortClass', () => {
    it('returns "sortable" for a column with no sort set', () => {
        expect(sortExt.getSortClass({ key: 'name' })).toBe('sortable');
    });

    it('returns "sortable sort-asc" when sort is ASC', () => {
        expect(sortExt.getSortClass({ key: 'name', sort: 'ASC' })).toBe('sortable sort-asc');
    });

    it('returns "sortable sort-desc" when sort is DESC', () => {
        expect(sortExt.getSortClass({ key: 'name', sort: 'DESC' })).toBe('sortable sort-desc');
    });

    it('returns empty string when sortable is false', () => {
        expect(sortExt.getSortClass({ key: 'name', sortable: false })).toBe('');
    });

    it('still adds sort indicator class when sortable is false (sort direction is preserved)', () => {
        expect(sortExt.getSortClass({ key: 'name', sortable: false, sort: 'ASC' })).toBe('sort-asc');
    });
});

// ─── _getColumnStyles ────────────────────────────────────────────────────────

describe('_getColumnStyles', () => {
    it('returns empty string for column with no width constraints', () => {
        expect(el._getColumnStyles({ key: 'name' })).toBe('');
    });

    it('returns min-width style', () => {
        expect(el._getColumnStyles({ key: 'name', minWidth: '100px' })).toBe('min-width: 100px');
    });

    it('returns max-width style', () => {
        expect(el._getColumnStyles({ key: 'name', maxWidth: '200px' })).toBe('max-width: 200px');
    });

    it('returns both styles joined with semicolon', () => {
        const styles = el._getColumnStyles({ key: 'name', minWidth: '100px', maxWidth: '200px' });
        expect(styles).toBe('min-width: 100px; max-width: 200px');
    });
});

// ─── defaultSort ──────────────────────────────────────────────────────────────

describe('defaultSort', () => {
    beforeEach(() => {
        sortExt._gridInstance = makeMockGrid([{ key: 'value', type: 'text' }]);
    });

    it('sorts numbers in ascending order', () => {
        expect(sortExt.defaultSort(1, 2, 'value')).toBeLessThan(0);
        expect(sortExt.defaultSort(2, 1, 'value')).toBeGreaterThan(0);
        expect(sortExt.defaultSort(5, 5, 'value')).toBe(0);
    });

    it('sorts strings alphabetically (case-insensitive via localeCompare)', () => {
        expect(sortExt.defaultSort('apple', 'banana', 'value')).toBeLessThan(0);
        expect(sortExt.defaultSort('banana', 'apple', 'value')).toBeGreaterThan(0);
    });

    it('sorts rating type strings (string comparison as fallback)', () => {
        sortExt._gridInstance = makeMockGrid([{ key: 'value', type: 'rating' }]);
        // '2/5' < '4/5' alphabetically
        expect(sortExt.defaultSort('2/5', '4/5', 'value')).toBeLessThan(0);
    });

    it('sorts image type strings (string comparison as fallback)', () => {
        sortExt._gridInstance = makeMockGrid([{ key: 'value', type: 'image' }]);
        expect(sortExt.defaultSort('a.jpg', 'b.jpg', 'value')).toBeLessThan(0);
        expect(sortExt.defaultSort('b.jpg', 'a.jpg', 'value')).toBeGreaterThan(0);
    });
});

// ─── sortData ────────────────────────────────────────────────────────────────

describe('sortData', () => {
    let mockRows;

    beforeEach(() => {
        mockRows = [{ price: 30 }, { price: 10 }, { price: 20 }];
        sortExt._gridInstance = makeMockGrid(
            [{ key: 'price', type: 'text' }],
            mockRows
        );
    });

    it('sorts rows ASC', () => {
        sortExt.sortData('price', 'ASC', null);
        expect(mockRows.map(r => r.price)).toEqual([10, 20, 30]);
    });

    it('sorts rows DESC', () => {
        sortExt.sortData('price', 'DESC', null);
        expect(mockRows.map(r => r.price)).toEqual([30, 20, 10]);
    });

    it('uses custom comparator when provided', () => {
        const customComparator = (a, b) => b - a; // reverse numeric
        sortExt.sortData('price', 'ASC', customComparator);
        expect(mockRows.map(r => r.price)).toEqual([30, 20, 10]);
    });

    it('mutates _rows in place', () => {
        const original = sortExt._gridInstance._rows;
        sortExt.sortData('price', 'ASC', null);
        expect(sortExt._gridInstance._rows).toBe(original);
    });

    it('does not mutate schema', () => {
        const schemaBefore = JSON.stringify(sortExt._gridInstance._schema);
        sortExt.sortData('price', 'ASC', null);
        expect(JSON.stringify(sortExt._gridInstance._schema)).toBe(schemaBefore);
    });

    it('sorts strings correctly', () => {
        const rows = [{ name: 'Charlie' }, { name: 'Alice' }, { name: 'Bob' }];
        sortExt._gridInstance = makeMockGrid([{ key: 'name', type: 'text' }], rows);
        sortExt.sortData('name', 'ASC', null);
        expect(rows.map(r => r.name)).toEqual(['Alice', 'Bob', 'Charlie']);
    });
});
