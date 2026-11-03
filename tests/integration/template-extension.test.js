import { describe, it, expect } from 'vitest';
import { createGrid } from '../setup.js';

// ─── renderTemplate ───────────────────────────────────────────────────────────

describe('TemplateExtension.renderTemplate', () => {
    it('replaces single {{variable}} with value', () => {
        const ext = new TemplateExtension();
        expect(ext.renderTemplate('Hello {{name}}', { name: 'World' })).toBe('Hello World');
    });

    it('replaces multiple variables', () => {
        const ext = new TemplateExtension();
        const result = ext.renderTemplate('{{a}} and {{b}}', { a: 'X', b: 'Y' });
        expect(result).toBe('X and Y');
    });

    it('navigates nested properties with dot notation', () => {
        const ext = new TemplateExtension();
        const result = ext.renderTemplate('{{row.name}}', { row: { name: 'Nested' } });
        expect(result).toBe('Nested');
    });

    it('returns empty string for missing property', () => {
        const ext = new TemplateExtension();
        const result = ext.renderTemplate('Hello {{unknown}}', { name: 'World' });
        expect(result).toBe('Hello ');
    });

    it('HTML-escapes values to prevent XSS', () => {
        const ext = new TemplateExtension();
        const result = ext.renderTemplate('{{v}}', { v: '<script>' });
        expect(result).not.toContain('<script>');
        expect(result).toContain('&lt;');
    });

    it('returns empty string for null value in slot', () => {
        const ext = new TemplateExtension();
        expect(ext.renderTemplate('{{v}}', { v: null })).toBe('');
    });
});

// ─── sanitizeTemplate ─────────────────────────────────────────────────────────

describe('TemplateExtension.sanitizeTemplate', () => {
    it('returns safe template unchanged', () => {
        const ext = new TemplateExtension();
        expect(ext.sanitizeTemplate('<span>{{name}}</span>')).toBe('<span>{{name}}</span>');
    });

    it('removes <script> tags', () => {
        const ext = new TemplateExtension();
        const result = ext.sanitizeTemplate('<script>alert(1)</script><b>ok</b>');
        expect(result).not.toContain('<script>');
        expect(result).toContain('<b>ok</b>');
    });

    it('removes inline event handlers', () => {
        const ext = new TemplateExtension();
        const result = ext.sanitizeTemplate('<img onerror="alert(1)" src="x">');
        expect(result).not.toMatch(/onerror/);
    });

    it('removes javascript: protocol', () => {
        const ext = new TemplateExtension();
        const result = ext.sanitizeTemplate('<a href="javascript:void(0)">click</a>');
        expect(result).not.toContain('javascript:');
    });

    it('removes iframe tags', () => {
        const ext = new TemplateExtension();
        const result = ext.sanitizeTemplate('<iframe src="evil.com"></iframe>safe');
        expect(result).not.toContain('<iframe');
        expect(result).toContain('safe');
    });

    it('returns null for non-string input', () => {
        const ext = new TemplateExtension();
        expect(ext.sanitizeTemplate(null)).toBeNull();
    });

    it('returns empty string unchanged', () => {
        const ext = new TemplateExtension();
        expect(ext.sanitizeTemplate('')).toBe('');
    });
});

// ─── Rating rendering ─────────────────────────────────────────────────────────

describe('TemplateExtension.renderRating', () => {
    it('renders .rating element for valid "value/max" input', () => {
        const ext = new TemplateExtension();
        const html = ext.renderRating('3/5');
        expect(html).toContain('class="rating"');
    });

    it('renders aria-label describing the rating', () => {
        const ext = new TemplateExtension();
        const html = ext.renderRating('4/5');
        expect(html).toMatch(/aria-label=".*4.*5.*"/i);
    });

    it('renders filled stars equal to value', () => {
        const ext = new TemplateExtension();
        const html = ext.renderRating('3/5');
        const filled = (html.match(/class="rating-star filled"/g) || []).length;
        expect(filled).toBe(3);
    });

    it('renders total stars equal to max', () => {
        const ext = new TemplateExtension();
        const html = ext.renderRating('3/5');
        const total = (html.match(/rating-star/g) || []).length;
        expect(total).toBe(5);
    });

    it('renders em-dash for invalid rating', () => {
        const ext = new TemplateExtension();
        expect(ext.renderRating('bad')).toContain('—');
    });

    it('renders numeric value using default max=5', () => {
        const ext = new TemplateExtension();
        const html = ext.renderRating(4);
        const filled = (html.match(/class="rating-star filled"/g) || []).length;
        expect(filled).toBe(4);
    });
});

// ─── Image rendering ─────────────────────────────────────────────────────────

describe('TemplateExtension.renderImage', () => {
    it('renders <img> with table-image class in table mode', () => {
        const ext = new TemplateExtension();
        const html = ext.renderImage('https://example.com/img.jpg', { isGridImage: false });
        expect(html).toContain('<img');
        expect(html).toContain('table-image');
    });

    it('renders <img> with grid-image class in grid mode', () => {
        const ext = new TemplateExtension();
        const html = ext.renderImage('https://example.com/img.jpg', { isGridImage: true });
        expect(html).toContain('grid-image');
    });

    it('renders placeholder when src is empty string', () => {
        const ext = new TemplateExtension();
        const html = ext.renderImage('', {});
        expect(html).not.toContain('<img');
    });

    it('parses object {src, alt} format', () => {
        const ext = new TemplateExtension();
        const html = ext.renderImage({ src: 'https://example.com/x.jpg', alt: 'X' }, {});
        expect(html).toContain('src=');
        expect(html).toContain('alt="X"');
    });
});

// ─── Rating/image via full grid render ───────────────────────────────────────

describe('TemplateExtension rating/image via grid render', () => {
    it('renders rating column in table', () => {
        const schema = [{ key: 'r', label: 'R', type: 'rating' }];
        const el = createGrid(schema, [{ r: '4/5' }], { layoutType: 'table' });
        const cell = el.shadowRoot.querySelector('tbody td');
        expect(cell.querySelector('.rating')).not.toBeNull();
    });

    it('renders image column in table', () => {
        const schema = [{ key: 'img', label: 'Img', type: 'image' }];
        const el = createGrid(schema, [{ img: 'https://example.com/x.jpg' }], { layoutType: 'table' });
        const cell = el.shadowRoot.querySelector('tbody td');
        expect(cell.querySelector('img')).not.toBeNull();
    });
});
