import { describe, it, expect, beforeEach } from 'vitest';

let el;
beforeEach(() => {
    el = document.createElement('swivel-grid');
});

// ─── _getSortClass ───────────────────────────────────────────────────────────

describe('_getSortClass', () => {
    it('returns "sortable" for a column with no sort set', () => {
        expect(el._getSortClass({ key: 'name' })).toBe('sortable');
    });

    it('returns "sortable sort-asc" when sort is ASC', () => {
        expect(el._getSortClass({ key: 'name', sort: 'ASC' })).toBe('sortable sort-asc');
    });

    it('returns "sortable sort-desc" when sort is DESC', () => {
        expect(el._getSortClass({ key: 'name', sort: 'DESC' })).toBe('sortable sort-desc');
    });

    it('returns empty string when sortable is false', () => {
        expect(el._getSortClass({ key: 'name', sortable: false })).toBe('');
    });

    it('still adds sort indicator class even when sortable is false (component behavior)', () => {
        // sortable:false only suppresses the 'sortable' class, not sort direction classes
        expect(el._getSortClass({ key: 'name', sortable: false, sort: 'ASC' })).toBe('sort-asc');
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

// ─── _defaultSort ────────────────────────────────────────────────────────────

describe('_defaultSort', () => {
    beforeEach(() => {
        el._schema = [{ key: 'value', type: 'text' }];
    });

    it('sorts numbers in ascending order', () => {
        expect(el._defaultSort(1, 2, 'value')).toBeLessThan(0);
        expect(el._defaultSort(2, 1, 'value')).toBeGreaterThan(0);
        expect(el._defaultSort(5, 5, 'value')).toBe(0);
    });

    it('sorts strings alphabetically (case-insensitive via localeCompare)', () => {
        expect(el._defaultSort('apple', 'banana', 'value')).toBeLessThan(0);
        expect(el._defaultSort('banana', 'apple', 'value')).toBeGreaterThan(0);
    });

    it('sorts rating type by value/max ratio', () => {
        el._schema = [{ key: 'value', type: 'rating' }];
        // 2/5 = 0.4 vs 4/5 = 0.8 → negative result
        expect(el._defaultSort('2/5', '4/5', 'value')).toBeLessThan(0);
    });

    it('sorts image type by src', () => {
        el._schema = [{ key: 'value', type: 'image' }];
        expect(el._defaultSort('a.jpg', 'b.jpg', 'value')).toBeLessThan(0);
        expect(el._defaultSort('b.jpg', 'a.jpg', 'value')).toBeGreaterThan(0);
    });
});

// ─── _sortData ───────────────────────────────────────────────────────────────

describe('_sortData', () => {
    beforeEach(() => {
        el._schema = [{ key: 'price', type: 'text' }];
        el._rows = [
            { price: 30 },
            { price: 10 },
            { price: 20 },
        ];
    });

    it('sorts rows ASC', () => {
        el._sortData('price', 'ASC', null);
        expect(el._rows.map(r => r.price)).toEqual([10, 20, 30]);
    });

    it('sorts rows DESC', () => {
        el._sortData('price', 'DESC', null);
        expect(el._rows.map(r => r.price)).toEqual([30, 20, 10]);
    });

    it('uses custom comparator when provided', () => {
        const customComparator = (a, b) => b - a; // reverse numeric
        el._sortData('price', 'ASC', customComparator);
        expect(el._rows.map(r => r.price)).toEqual([30, 20, 10]);
    });

    it('mutates _rows in place', () => {
        const original = el._rows;
        el._sortData('price', 'ASC', null);
        expect(el._rows).toBe(original); // same array reference
    });

    it('does not mutate schema', () => {
        const schemaBefore = JSON.stringify(el._schema);
        el._sortData('price', 'ASC', null);
        expect(JSON.stringify(el._schema)).toBe(schemaBefore);
    });

    it('sorts strings correctly', () => {
        el._schema = [{ key: 'name', type: 'text' }];
        el._rows = [{ name: 'Charlie' }, { name: 'Alice' }, { name: 'Bob' }];
        el._sortData('name', 'ASC', null);
        expect(el._rows.map(r => r.name)).toEqual(['Alice', 'Bob', 'Charlie']);
    });
});
