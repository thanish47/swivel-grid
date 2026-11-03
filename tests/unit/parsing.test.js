import { describe, it, expect, beforeEach } from 'vitest';

let el;
beforeEach(() => {
    el = document.createElement('swivel-grid');
});

// ─── _parseRating ───────────────────────────────────────────────────────────

describe('_parseRating', () => {
    it('parses object format {value, max}', () => {
        expect(el._parseRating({ value: 4, max: 5 })).toEqual({ value: 4, max: 5, isValid: true });
    });

    it('parses object with string value', () => {
        expect(el._parseRating({ value: '3', max: '5' })).toEqual({ value: 3, max: 5, isValid: true });
    });

    it('parses "value/max" string format', () => {
        expect(el._parseRating('4/5')).toEqual({ value: 4, max: 5, isValid: true });
    });

    it('parses "1/10" with custom max', () => {
        expect(el._parseRating('1/10')).toEqual({ value: 1, max: 10, isValid: true });
    });

    it('parses numeric value (uses default max of 5)', () => {
        expect(el._parseRating(3)).toEqual({ value: 3, max: 5, isValid: true });
    });

    it('parses numeric string without slash', () => {
        expect(el._parseRating('2')).toEqual({ value: 2, max: 5, isValid: true });
    });

    it('returns isValid:false for non-numeric string', () => {
        const result = el._parseRating('abc');
        expect(result.isValid).toBe(false);
        expect(result.value).toBe(0);
    });

    it('returns isValid:false for null', () => {
        const result = el._parseRating(null);
        expect(result.isValid).toBe(false);
        expect(result.value).toBe(0);
    });

    it('returns isValid:false for undefined', () => {
        const result = el._parseRating(undefined);
        expect(result.isValid).toBe(false);
    });

    it('returns isValid:false for empty string', () => {
        const result = el._parseRating('');
        expect(result.isValid).toBe(false);
    });

    it('handles object with missing value', () => {
        const result = el._parseRating({ max: 5 });
        expect(result.value).toBe(0);
        expect(result.isValid).toBe(false);
    });
});

// ─── _parseImage ────────────────────────────────────────────────────────────

describe('_parseImage', () => {
    it('parses object format {src, alt}', () => {
        expect(el._parseImage({ src: 'url.jpg', alt: 'Cat' })).toEqual({ src: 'url.jpg', alt: 'Cat' });
    });

    it('uses default alt when object has no alt', () => {
        expect(el._parseImage({ src: 'url.jpg' })).toEqual({ src: 'url.jpg', alt: 'Image' });
    });

    it('returns empty src when object has no src', () => {
        expect(el._parseImage({ alt: 'Cat' })).toEqual({ src: '', alt: 'Cat' });
    });

    it('parses string as src with default alt', () => {
        expect(el._parseImage('url.jpg')).toEqual({ src: 'url.jpg', alt: 'Image' });
    });

    it('returns empty src for null', () => {
        expect(el._parseImage(null)).toEqual({ src: '', alt: 'Image' });
    });

    it('returns empty src for empty string', () => {
        expect(el._parseImage('')).toEqual({ src: '', alt: 'Image' });
    });

    it('returns empty src for undefined', () => {
        expect(el._parseImage(undefined)).toEqual({ src: '', alt: 'Image' });
    });
});

// ─── _parseJsonAttribute ────────────────────────────────────────────────────

describe('_parseJsonAttribute', () => {
    it('parses valid JSON schema into _schema', () => {
        const json = JSON.stringify([{ key: 'name', label: 'Name' }]);
        el._parseJsonAttribute('schema', json);
        expect(el._schema).toHaveLength(1);
        expect(el._schema[0].key).toBe('name');
    });

    it('parses valid JSON rows into _rows', () => {
        const json = JSON.stringify([{ name: 'Test' }]);
        el._parseJsonAttribute('rows', json);
        expect(el._rows).toHaveLength(1);
        expect(el._rows[0].name).toBe('Test');
    });

    it('falls back to empty array on invalid JSON', () => {
        el._parseJsonAttribute('rows', 'not-valid-json');
        expect(el._rows).toEqual([]);
    });

    it('falls back to empty array on null', () => {
        el._parseJsonAttribute('rows', null);
        expect(el._rows).toEqual([]);
    });

    it('falls back to empty array on empty string', () => {
        el._parseJsonAttribute('rows', '');
        expect(el._rows).toEqual([]);
    });

    it('does not throw on malformed JSON', () => {
        expect(() => el._parseJsonAttribute('schema', '{bad json')).not.toThrow();
    });
});

// ─── _escapeHtml ────────────────────────────────────────────────────────────

describe('_escapeHtml', () => {
    it('escapes < and >', () => {
        expect(el._escapeHtml('<script>')).toBe('&lt;script&gt;');
    });

    it('escapes ampersand', () => {
        expect(el._escapeHtml('a & b')).toBe('a &amp; b');
    });

    it('leaves plain text unchanged', () => {
        expect(el._escapeHtml('Hello World')).toBe('Hello World');
    });

    it('escapes multiple special chars in one string', () => {
        const result = el._escapeHtml('<div class="foo">');
        expect(result).toBe('&lt;div class="foo"&gt;');
    });

    it('handles empty string', () => {
        expect(el._escapeHtml('')).toBe('');
    });

    it('handles numeric input via String coercion', () => {
        expect(el._escapeHtml(String(42))).toBe('42');
    });
});
