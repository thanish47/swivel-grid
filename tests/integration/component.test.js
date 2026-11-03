import { describe, it, expect, beforeEach } from 'vitest';

let el;
beforeEach(() => {
    el = document.createElement('swivel-grid');
    document.body.appendChild(el);
});

// ─── Default state ────────────────────────────────────────────────────────────

describe('Default state', () => {
    it('defaults layoutType to grid', () => {
        expect(el.layoutType).toBe('grid');
    });

    it('defaults schema to empty array', () => {
        expect(el.schema).toEqual([]);
    });

    it('defaults rows to empty array', () => {
        expect(el.rows).toEqual([]);
    });

    it('defaults pageSize to 100', () => {
        expect(el.pageSize).toBe(100);
    });

    it('defaults totalPages to null', () => {
        expect(el.totalPages).toBeNull();
    });

    it('has a shadow root', () => {
        expect(el.shadowRoot).not.toBeNull();
    });
});

// ─── layoutType setter ────────────────────────────────────────────────────────

describe('layoutType setter', () => {
    it('"table" sets layoutType to table', () => {
        el.layoutType = 'table';
        expect(el._layoutType).toBe('table');
    });

    it('"list" maps to table (alias)', () => {
        el.layoutType = 'list';
        expect(el._layoutType).toBe('table');
    });

    it('"grid" keeps grid', () => {
        el.layoutType = 'grid';
        expect(el._layoutType).toBe('grid');
    });

    it('unknown value defaults to grid', () => {
        el.layoutType = 'cards';
        expect(el._layoutType).toBe('grid');
    });

    it('marks _propSet.layoutType as true', () => {
        el.layoutType = 'table';
        expect(el._propSet.layoutType).toBe(true);
    });
});

// ─── schema setter ────────────────────────────────────────────────────────────

describe('schema setter', () => {
    it('accepts an array', () => {
        el.schema = [{ key: 'name', label: 'Name' }];
        expect(el._schema).toHaveLength(1);
    });

    it('falls back to empty array for non-array input', () => {
        el.schema = 'invalid';
        expect(el._schema).toEqual([]);
    });

    it('falls back to empty array for null', () => {
        el.schema = null;
        expect(el._schema).toEqual([]);
    });

    it('marks _propSet.schema as true', () => {
        el.schema = [];
        expect(el._propSet.schema).toBe(true);
    });
});

// ─── rows setter ─────────────────────────────────────────────────────────────

describe('rows setter', () => {
    it('accepts an array', () => {
        el.rows = [{ name: 'A' }];
        expect(el._rows).toHaveLength(1);
    });

    it('falls back to empty array for non-array input', () => {
        el.rows = 'invalid';
        expect(el._rows).toEqual([]);
    });

    it('marks _propSet.rows as true', () => {
        el.rows = [];
        expect(el._propSet.rows).toBe(true);
    });
});

// ─── pageSize setter ──────────────────────────────────────────────────────────

describe('pageSize setter', () => {
    it('stores a valid positive number', () => {
        el.pageSize = 25;
        expect(el._pageSize).toBe(25);
    });

    it('defaults to 100 for zero', () => {
        el.pageSize = 0;
        expect(el._pageSize).toBe(100);
    });

    it('defaults to 100 for negative numbers', () => {
        el.pageSize = -5;
        expect(el._pageSize).toBe(100);
    });

    it('defaults to 100 for non-number', () => {
        el.pageSize = 'big';
        expect(el._pageSize).toBe(100);
    });
});

// ─── totalPages setter ────────────────────────────────────────────────────────

describe('totalPages setter', () => {
    it('stores a valid positive number', () => {
        el.totalPages = 10;
        expect(el._totalPages).toBe(10);
    });

    it('stores null for zero', () => {
        el.totalPages = 0;
        expect(el._totalPages).toBeNull();
    });

    it('stores null for negative numbers', () => {
        el.totalPages = -1;
        expect(el._totalPages).toBeNull();
    });

    it('stores null for non-number', () => {
        el.totalPages = 'ten';
        expect(el._totalPages).toBeNull();
    });
});

// ─── Property precedence over attributes ─────────────────────────────────────

describe('Property vs attribute precedence', () => {
    it('property set after attribute takes precedence', () => {
        el.setAttribute('layout-type', 'table');
        el.layoutType = 'grid'; // property override
        expect(el._layoutType).toBe('grid');
    });

    it('attribute change is ignored after property was set', () => {
        el.layoutType = 'grid';
        el.setAttribute('layout-type', 'table'); // should be ignored
        expect(el._layoutType).toBe('grid');
    });
});

// ─── attributeChangedCallback ─────────────────────────────────────────────────

describe('attributeChangedCallback', () => {
    it('updates layoutType from layout-type attribute', () => {
        el.setAttribute('layout-type', 'table');
        expect(el._layoutType).toBe('table');
    });

    it('parses schema JSON from attribute', () => {
        const schema = JSON.stringify([{ key: 'name', label: 'Name' }]);
        el.setAttribute('schema', schema);
        expect(el._schema).toHaveLength(1);
    });

    it('parses rows JSON from attribute', () => {
        const rows = JSON.stringify([{ name: 'Row 1' }]);
        el.setAttribute('rows', rows);
        expect(el._rows).toHaveLength(1);
    });

    it('does nothing when old and new values are equal', () => {
        el.setAttribute('layout-type', 'table');
        const spy = el.render.bind(el);
        el.setAttribute('layout-type', 'table'); // same value — no-op
        // no error thrown, state unchanged
        expect(el._layoutType).toBe('table');
    });
});
