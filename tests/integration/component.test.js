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

    it('has a shadow root', () => {
        expect(el.shadowRoot).not.toBeNull();
    });

    it('has an empty _extensions map', () => {
        expect(el._extensions).toBeInstanceOf(Map);
        expect(el._extensions.size).toBe(0);
    });

    it('has beforeRender and afterRender hook arrays', () => {
        expect(Array.isArray(el._extensionHooks.beforeRender)).toBe(true);
        expect(Array.isArray(el._extensionHooks.afterRender)).toBe(true);
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
        el.setAttribute('layout-type', 'table'); // same value — no-op
        expect(el._layoutType).toBe('table');
    });
});

// ─── Extension management API ─────────────────────────────────────────────────

describe('Extension management API', () => {
    it('registerExtension returns true for a new extension', () => {
        const ext = new SortingExtension();
        expect(el.registerExtension(ext)).toBe(true);
    });

    it('registerExtension returns false for duplicate', () => {
        const ext = new SortingExtension();
        el.registerExtension(ext);
        const ext2 = new SortingExtension();
        expect(el.registerExtension(ext2)).toBe(false);
    });

    it('getExtension returns the registered extension', () => {
        const ext = new SortingExtension();
        el.registerExtension(ext);
        expect(el.getExtension('sorting')).toBe(ext);
    });

    it('getExtension returns null for unknown name', () => {
        expect(el.getExtension('nonexistent')).toBeNull();
    });

    it('hasExtension returns true after registration', () => {
        el.registerExtension(new SortingExtension());
        expect(el.hasExtension('sorting')).toBe(true);
    });

    it('hasExtension returns false before registration', () => {
        expect(el.hasExtension('sorting')).toBe(false);
    });

    it('listExtensions returns array of registered names', () => {
        el.registerExtension(new SortingExtension());
        el.registerExtension(new SearchExtension());
        const names = el.listExtensions();
        expect(names).toContain('sorting');
        expect(names).toContain('search');
    });

    it('unregisterExtension removes the extension', () => {
        el.registerExtension(new SortingExtension());
        el.unregisterExtension('sorting');
        expect(el.hasExtension('sorting')).toBe(false);
    });

    it('unregisterExtension returns false for unknown extension', () => {
        expect(el.unregisterExtension('nonexistent')).toBe(false);
    });

    it('extensions are inserted into beforeRender hooks by priority', () => {
        el.registerExtension(new SortingExtension()); // priority 30
        el.registerExtension(new LayoutRendererExtension()); // priority 10
        // LayoutRenderer (10) should be before Sorting (30) in hooks
        const beforeRenderHooks = el._extensionHooks.beforeRender;
        const layoutIdx = beforeRenderHooks.findIndex(e => e.name === 'layout-renderer');
        const sortIdx = beforeRenderHooks.findIndex(e => e.name === 'sorting');
        expect(layoutIdx).toBeLessThan(sortIdx);
    });
});
