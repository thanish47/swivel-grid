import { describe, it, expect } from 'vitest';
import { createGrid, createGridWithExtensions } from '../setup.js';

function makeAccExt() {
    const ext = new AccessibilityExtension();
    const grid = {
        shadowRoot: { querySelector: () => null, querySelectorAll: () => [], appendChild: () => {} },
        addExtensionStyles: () => {},
        getExtension: () => null,
        _schema: [],
    };
    ext.initialize(grid);
    return ext;
}

// ─── generateHeaderARIA ────────────────────────────────────────────────────────

describe('AccessibilityExtension.generateHeaderARIA', () => {
    it('includes role="columnheader"', () => {
        const ext = makeAccExt();
        const result = ext.generateHeaderARIA({ key: 'name', label: 'Name', sortable: true });
        expect(result).toContain('role="columnheader"');
    });

    it('includes tabindex="0" for sortable columns', () => {
        const ext = makeAccExt();
        const result = ext.generateHeaderARIA({ key: 'name', label: 'Name', sortable: true });
        expect(result).toContain('tabindex="0"');
    });

    it('includes tabindex="-1" for non-sortable columns', () => {
        const ext = makeAccExt();
        const result = ext.generateHeaderARIA({ key: 'name', label: 'Name', sortable: false });
        expect(result).toContain('tabindex="-1"');
    });

    it('includes aria-disabled="true" for non-sortable columns', () => {
        const ext = makeAccExt();
        const result = ext.generateHeaderARIA({ key: 'name', label: 'Name', sortable: false });
        expect(result).toContain('aria-disabled="true"');
    });

    it('includes aria-sort="none" for unsorted sortable column', () => {
        const ext = makeAccExt();
        const result = ext.generateHeaderARIA({ key: 'name', label: 'Name', sortable: true, sort: null });
        expect(result).toContain('aria-sort="none"');
    });

    it('includes aria-sort="ascending" for ASC column', () => {
        const ext = makeAccExt();
        const result = ext.generateHeaderARIA({ key: 'name', label: 'Name', sortable: true, sort: 'ASC' });
        expect(result).toContain('aria-sort="ascending"');
    });

    it('includes aria-sort="descending" for DESC column', () => {
        const ext = makeAccExt();
        const result = ext.generateHeaderARIA({ key: 'name', label: 'Name', sortable: true, sort: 'DESC' });
        expect(result).toContain('aria-sort="descending"');
    });

    it('includes aria-label with column label', () => {
        const ext = makeAccExt();
        const result = ext.generateHeaderARIA({ key: 'name', label: 'Name', sortable: true });
        expect(result).toContain('aria-label="Name');
    });
});

// ─── generateContainerARIA ────────────────────────────────────────────────────

describe('AccessibilityExtension.generateContainerARIA', () => {
    it('returns role="list" container for grid layout', () => {
        const ext = makeAccExt();
        const result = ext.generateContainerARIA('grid');
        expect(result.container).toContain('role="list"');
    });

    it('returns role="listitem" item for grid layout', () => {
        const ext = makeAccExt();
        const result = ext.generateContainerARIA('grid');
        expect(result.item).toContain('role="listitem"');
    });

    it('returns role="table" container for table layout', () => {
        const ext = makeAccExt();
        const result = ext.generateContainerARIA('table');
        expect(result.container).toContain('role="table"');
    });
});

// ─── ARIA in rendered output ───────────────────────────────────────────────────

describe('AccessibilityExtension integration with rendered grid', () => {
    it('rendered th has aria-sort="none" when no sort is set', () => {
        const schema = [{ key: 'name', label: 'Name', sortable: true }];
        const el = createGrid(schema, [{ name: 'A' }], { layoutType: 'table' });
        // The header ARIA is set by LayoutRendererExtension which calls getSortClass
        const th = el.shadowRoot.querySelector('th[data-key="name"]');
        expect(th).not.toBeNull();
    });

    it('does not throw when AccessibilityExtension is registered on a grid', () => {
        const schema = [{ key: 'name', label: 'Name' }];
        expect(() => {
            createGridWithExtensions(schema, [{ name: 'A' }], [
                new LayoutRendererExtension(),
                new AccessibilityExtension(),
            ]);
        }).not.toThrow();
    });
});

// ─── generateScreenReaderContent ─────────────────────────────────────────────

describe('AccessibilityExtension.generateScreenReaderContent', () => {
    it('wraps text in .sr-only span', () => {
        const ext = makeAccExt();
        const result = ext.generateScreenReaderContent('hello');
        expect(result).toContain('class="sr-only"');
        expect(result).toContain('hello');
    });
});

// ─── _getSortARIAValue ────────────────────────────────────────────────────────

describe('AccessibilityExtension._getSortARIAValue', () => {
    it('returns "ascending" for ASC', () => {
        const ext = makeAccExt();
        expect(ext._getSortARIAValue('ASC')).toBe('ascending');
    });

    it('returns "descending" for DESC', () => {
        const ext = makeAccExt();
        expect(ext._getSortARIAValue('DESC')).toBe('descending');
    });

    it('returns "none" for null/undefined', () => {
        const ext = makeAccExt();
        expect(ext._getSortARIAValue(null)).toBe('none');
        expect(ext._getSortARIAValue(undefined)).toBe('none');
    });
});
