import { describe, it, expect } from 'vitest';
import { createGrid } from '../setup.js';

function makeCssExt() {
    const ext = new CssClassesExtension();
    // Minimal mock grid so onInitialize doesn't fail
    const grid = {
        sanitizeClassName: null,
        applyCellClass: null,
        applyHeaderClass: null,
        applyRowClass: null,
        setCssClassConfig: null,
        getCssClassConfig: null,
    };
    ext.initialize(grid);
    return ext;
}

// ─── sanitizeClassName ────────────────────────────────────────────────────────

describe('CssClassesExtension.sanitizeClassName', () => {
    it('returns valid CSS class name unchanged', () => {
        const ext = makeCssExt();
        expect(ext.sanitizeClassName('valid-class')).toBe('valid-class');
    });

    it('preserves underscores and hyphens', () => {
        const ext = makeCssExt();
        expect(ext.sanitizeClassName('my_class-name')).toBe('my_class-name');
    });

    it('strips characters outside [a-zA-Z0-9_-]', () => {
        const ext = makeCssExt();
        expect(ext.sanitizeClassName('<danger>')).toBe('danger');
    });

    it('handles multiple space-separated classes', () => {
        const ext = makeCssExt();
        const result = ext.sanitizeClassName('alpha beta');
        expect(result).toContain('alpha');
        expect(result).toContain('beta');
    });

    it('returns empty string for null', () => {
        const ext = makeCssExt();
        expect(ext.sanitizeClassName(null)).toBe('');
    });

    it('returns empty string for non-string', () => {
        const ext = makeCssExt();
        expect(ext.sanitizeClassName(42)).toBe('');
    });

    it('returns empty string for empty string', () => {
        const ext = makeCssExt();
        expect(ext.sanitizeClassName('')).toBe('');
    });

    it('prefixes digit-starting class names with cls-', () => {
        const ext = makeCssExt();
        expect(ext.sanitizeClassName('123abc')).toMatch(/^cls-/);
    });

    it('removes blacklisted class "script"', () => {
        const ext = makeCssExt();
        expect(ext.sanitizeClassName('script')).toBe('');
    });
});

// ─── applyCellClass ───────────────────────────────────────────────────────────

describe('CssClassesExtension.applyCellClass', () => {
    it('wraps content in span with sanitized class', () => {
        const ext = makeCssExt();
        const result = ext.applyCellClass('hello', { cellClass: 'highlight' }, 'hello', {});
        expect(result).toContain('<span class="highlight">hello</span>');
    });

    it('returns content unchanged when no cellClass set', () => {
        const ext = makeCssExt();
        expect(ext.applyCellClass('hello', {}, 'hello', {})).toBe('hello');
    });

    it('returns content unchanged when cellClass sanitizes to empty', () => {
        const ext = makeCssExt();
        const result = ext.applyCellClass('x', { cellClass: '<>' }, 'x', {});
        expect(result).toBe('x');
    });

    it('does not double-wrap content already wrapped with class', () => {
        const ext = makeCssExt();
        const pre = '<span class="existing">text</span>';
        const result = ext.applyCellClass(pre, { cellClass: 'extra' }, 'text', {});
        expect(result).toBe(pre);
    });
});

// ─── applyHeaderClass ─────────────────────────────────────────────────────────

describe('CssClassesExtension.applyHeaderClass', () => {
    it('wraps header in span with class', () => {
        const ext = makeCssExt();
        const result = ext.applyHeaderClass('Name', { headerClass: 'header-bold' });
        expect(result).toContain('<span class="header-bold">Name</span>');
    });

    it('returns content unchanged when no headerClass', () => {
        const ext = makeCssExt();
        expect(ext.applyHeaderClass('Name', {})).toBe('Name');
    });
});

// ─── applyRowClass ────────────────────────────────────────────────────────────

describe('CssClassesExtension.applyRowClass', () => {
    it('includes row index class', () => {
        const ext = makeCssExt();
        expect(ext.applyRowClass({}, 2)).toContain('row-2');
    });

    it('includes row-even for even index', () => {
        const ext = makeCssExt();
        expect(ext.applyRowClass({}, 2)).toContain('row-even');
    });

    it('includes row-odd for odd index', () => {
        const ext = makeCssExt();
        expect(ext.applyRowClass({}, 1)).toContain('row-odd');
    });

    it('includes sanitized status class', () => {
        const ext = makeCssExt();
        const classes = ext.applyRowClass({ status: 'active' }, 0);
        expect(classes).toContain('row-status-active');
    });
});

// ─── processSchemaClasses ─────────────────────────────────────────────────────

describe('CssClassesExtension.processSchemaClasses', () => {
    it('removes headerClass when it sanitizes to empty string', () => {
        const ext = makeCssExt();
        // '<>' has no valid chars after sanitization → empty → key deleted
        const result = ext.processSchemaClasses([{ key: 'a', headerClass: '<>' }]);
        expect(result[0].headerClass).toBeUndefined();
    });

    it('strips invalid characters from headerClass but keeps the class', () => {
        const ext = makeCssExt();
        // '<bad>' → 'bad' (valid chars remain) → kept as 'bad'
        const result = ext.processSchemaClasses([{ key: 'a', headerClass: '<bad>' }]);
        expect(result[0].headerClass).toBe('bad');
    });

    it('preserves valid cellClass', () => {
        const ext = makeCssExt();
        const result = ext.processSchemaClasses([{ key: 'a', cellClass: 'nice-class' }]);
        expect(result[0].cellClass).toBe('nice-class');
    });
});

// ─── Integration: cellClass applied in grid render ────────────────────────────

describe('CssClassesExtension via grid render', () => {
    it('applies cellClass wrapper in rendered tbody', () => {
        const schema = [{ key: 'name', label: 'Name', cellClass: 'cell-hi' }];
        const el = createGrid(schema, [{ name: 'Foo' }], { layoutType: 'table' });
        const cell = el.shadowRoot.querySelector('tbody td');
        expect(cell.querySelector('.cell-hi')).not.toBeNull();
    });
});
