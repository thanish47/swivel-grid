import { describe, it, expect, beforeEach } from 'vitest';

let el;
let templateExt;

beforeEach(() => {
    el = document.createElement('swivel-grid');
    templateExt = new TemplateExtension();
});

// ─── renderTemplate (via TemplateExtension) ───────────────────────────────────

describe('renderTemplate', () => {
    it('replaces a single {{variable}}', () => {
        expect(templateExt.renderTemplate('Hello {{name}}', { name: 'World' })).toBe('Hello World');
    });

    it('replaces multiple variables', () => {
        const result = templateExt.renderTemplate('{{a}} and {{b}}', { a: 'foo', b: 'bar' });
        expect(result).toBe('foo and bar');
    });

    it('navigates nested properties with dot notation', () => {
        const result = templateExt.renderTemplate('{{row.name}}', { row: { name: 'Alice' } });
        expect(result).toBe('Alice');
    });

    it('returns empty string when property is missing', () => {
        // TemplateExtension returns '' for missing properties (unlike old core which kept {{placeholder}})
        const result = templateExt.renderTemplate('Hello {{unknown}}', { name: 'World' });
        expect(result).toBe('Hello ');
    });

    it('HTML-escapes values to prevent XSS', () => {
        const result = templateExt.renderTemplate('{{value}}', { value: '<script>alert(1)</script>' });
        expect(result).not.toContain('<script>');
        expect(result).toContain('&lt;script&gt;');
    });

    it('returns empty string when template is not a string and no value', () => {
        const result = templateExt.renderTemplate(null, { value: '' });
        expect(result).toBe('');
    });

    it('returns escaped value when template is not a string but value exists', () => {
        const result = templateExt.renderTemplate(42, { value: 'fallback' });
        expect(result).toBe('fallback');
    });

    it('returns empty string for null value in template slot', () => {
        const result = templateExt.renderTemplate('{{value}}', { value: null });
        expect(result).toBe('');
    });
});

// ─── sanitizeTemplate (via TemplateExtension) ─────────────────────────────────

describe('sanitizeTemplate', () => {
    it('returns the template unchanged when it is safe', () => {
        const safe = '<strong>{{value}}</strong>';
        expect(templateExt.sanitizeTemplate(safe)).toBe(safe);
    });

    it('removes <script> tags', () => {
        const result = templateExt.sanitizeTemplate('<script>alert(1)</script>');
        expect(result).not.toContain('<script>');
    });

    it('removes inline event handlers (onerror=)', () => {
        const result = templateExt.sanitizeTemplate('<img onerror="bad()">');
        expect(result).not.toContain('onerror=');
    });

    it('removes javascript: protocol', () => {
        const result = templateExt.sanitizeTemplate('<a href="javascript:void(0)">');
        expect(result).not.toContain('javascript:');
    });

    it('removes iframe tags', () => {
        const result = templateExt.sanitizeTemplate('<iframe src="bad.html">');
        expect(result).not.toContain('<iframe');
    });

    it('returns null for non-string input', () => {
        expect(templateExt.sanitizeTemplate(null)).toBeNull();
        expect(templateExt.sanitizeTemplate(42)).toBeNull();
        expect(templateExt.sanitizeTemplate({})).toBeNull();
    });

    it('returns empty string unchanged', () => {
        expect(templateExt.sanitizeTemplate('')).toBe('');
    });
});

// ─── _sanitizeClassName ──────────────────────────────────────────────────────

describe('_sanitizeClassName', () => {
    it('returns a valid CSS class name unchanged', () => {
        expect(el._sanitizeClassName('my-class')).toBe('my-class');
    });

    it('preserves underscores and hyphens', () => {
        expect(el._sanitizeClassName('btn_primary-lg')).toBe('btn_primary-lg');
    });

    it('strips characters outside [word characters and hyphens]', () => {
        const result = el._sanitizeClassName('bad!class');
        expect(result).not.toContain('!');
    });

    it('strips angle brackets and quotes', () => {
        const result = el._sanitizeClassName('<script>');
        expect(result).not.toContain('<');
        expect(result).not.toContain('>');
    });

    it('handles multiple space-separated classes', () => {
        const result = el._sanitizeClassName('class-a class-b');
        expect(result).toBe('class-a class-b');
    });

    it('returns empty string for null', () => {
        expect(el._sanitizeClassName(null)).toBe('');
    });

    it('returns empty string for non-string types', () => {
        expect(el._sanitizeClassName(123)).toBe('');
        expect(el._sanitizeClassName({})).toBe('');
    });

    it('returns empty string for empty string input', () => {
        expect(el._sanitizeClassName('')).toBe('');
    });
});

// ─── _getColumnStyles ────────────────────────────────────────────────────────

describe('_getColumnStyles (template module)', () => {
    it('returns both min and max width styles when both set', () => {
        const styles = el._getColumnStyles({ minWidth: '120px', maxWidth: '300px' });
        expect(styles).toContain('min-width: 120px');
        expect(styles).toContain('max-width: 300px');
    });

    it('returns empty string when neither width is set', () => {
        expect(el._getColumnStyles({})).toBe('');
    });
});
