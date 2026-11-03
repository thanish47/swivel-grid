import { describe, it, expect } from 'vitest';
import { createGrid, sampleSchema, sampleRows } from '../setup.js';

const textSchema = [
    { key: 'name', label: 'Name' },
    { key: 'price', label: 'Price' },
];

const textRows = [
    { name: 'Alpha', price: 10 },
    { name: 'Beta', price: 20 },
];

// ─── Empty state ─────────────────────────────────────────────────────────────

describe('Empty state', () => {
    it('renders empty state when schema is empty', () => {
        const el = createGrid([], textRows);
        expect(el.shadowRoot.querySelector('.empty-state')).not.toBeNull();
    });

    it('renders empty state when rows is empty', () => {
        const el = createGrid(textSchema, []);
        expect(el.shadowRoot.querySelector('.empty-state')).not.toBeNull();
    });

    it('shows empty-state message text', () => {
        const el = createGrid([], []);
        const emptyState = el.shadowRoot.querySelector('.empty-state');
        expect(emptyState.textContent).toContain('No data available');
    });
});

// ─── Table rendering ─────────────────────────────────────────────────────────

describe('Table rendering', () => {
    it('renders a <table> element', () => {
        const el = createGrid(textSchema, textRows, { layoutType: 'table' });
        expect(el.shadowRoot.querySelector('table')).not.toBeNull();
    });

    it('renders correct number of column headers', () => {
        const el = createGrid(textSchema, textRows, { layoutType: 'table' });
        const headers = el.shadowRoot.querySelectorAll('th');
        expect(headers).toHaveLength(textSchema.length);
    });

    it('renders header labels', () => {
        const el = createGrid(textSchema, textRows, { layoutType: 'table' });
        const headers = el.shadowRoot.querySelectorAll('th');
        expect(headers[0].textContent.trim()).toBe('Name');
        expect(headers[1].textContent.trim()).toBe('Price');
    });

    it('renders correct number of body rows', () => {
        const el = createGrid(textSchema, textRows, { layoutType: 'table' });
        const rows = el.shadowRoot.querySelectorAll('tbody tr');
        expect(rows).toHaveLength(textRows.length);
    });

    it('renders cell values in rows', () => {
        const el = createGrid(textSchema, textRows, { layoutType: 'table' });
        const firstRow = el.shadowRoot.querySelector('tbody tr:first-child');
        expect(firstRow.textContent).toContain('Alpha');
    });

    it('renders column headers with role=columnheader', () => {
        const el = createGrid(textSchema, textRows, { layoutType: 'table' });
        const headers = el.shadowRoot.querySelectorAll('th[role="columnheader"]');
        expect(headers).toHaveLength(textSchema.length);
    });

    it('renders headers with aria-sort="none" when unsorted', () => {
        const el = createGrid(textSchema, textRows, { layoutType: 'table' });
        const th = el.shadowRoot.querySelector('th[data-key="name"]');
        expect(th.getAttribute('aria-sort')).toBe('none');
    });

    it('applies sort-asc class when column sort is ASC', () => {
        const schema = [{ key: 'name', label: 'Name', sort: 'ASC' }];
        const el = createGrid(schema, [{ name: 'A' }], { layoutType: 'table' });
        const th = el.shadowRoot.querySelector('th[data-key="name"]');
        expect(th.classList.contains('sort-asc')).toBe(true);
    });

    it('applies sort-desc class when column sort is DESC', () => {
        const schema = [{ key: 'name', label: 'Name', sort: 'DESC' }];
        const el = createGrid(schema, [{ name: 'A' }], { layoutType: 'table' });
        const th = el.shadowRoot.querySelector('th[data-key="name"]');
        expect(th.classList.contains('sort-desc')).toBe(true);
    });

    it('sets aria-sort="ascending" when sort is ASC', () => {
        const schema = [{ key: 'name', label: 'Name', sort: 'ASC' }];
        const el = createGrid(schema, [{ name: 'A' }], { layoutType: 'table' });
        const th = el.shadowRoot.querySelector('th[data-key="name"]');
        expect(th.getAttribute('aria-sort')).toBe('ascending');
    });

    it('applies min-width style to headers', () => {
        const schema = [{ key: 'name', label: 'Name', minWidth: '150px' }];
        const el = createGrid(schema, [{ name: 'A' }], { layoutType: 'table' });
        const th = el.shadowRoot.querySelector('th[data-key="name"]');
        expect(th.style.minWidth || th.getAttribute('style')).toContain('150px');
    });
});

// ─── Grid rendering ──────────────────────────────────────────────────────────

describe('Grid rendering', () => {
    it('renders .grid-container', () => {
        const el = createGrid(textSchema, textRows, { layoutType: 'grid' });
        expect(el.shadowRoot.querySelector('.grid-container')).not.toBeNull();
    });

    it('renders correct number of .grid-card elements', () => {
        const el = createGrid(textSchema, textRows, { layoutType: 'grid' });
        const cards = el.shadowRoot.querySelectorAll('.grid-card');
        expect(cards).toHaveLength(textRows.length);
    });

    it('renders .grid-container with role=list', () => {
        const el = createGrid(textSchema, textRows, { layoutType: 'grid' });
        const grid = el.shadowRoot.querySelector('.grid-container');
        expect(grid.getAttribute('role')).toBe('list');
    });

    it('renders .grid-card with role=listitem', () => {
        const el = createGrid(textSchema, textRows, { layoutType: 'grid' });
        const card = el.shadowRoot.querySelector('.grid-card');
        expect(card.getAttribute('role')).toBe('listitem');
    });

    it('renders grid field labels', () => {
        const el = createGrid(textSchema, textRows, { layoutType: 'grid' });
        const labels = el.shadowRoot.querySelectorAll('.grid-field-label');
        expect(labels.length).toBeGreaterThan(0);
    });
});

// ─── Rating column ────────────────────────────────────────────────────────────

describe('Rating column rendering', () => {
    const ratingSchema = [{ key: 'rating', label: 'Rating', type: 'rating' }];

    it('renders .rating element for valid rating', () => {
        const el = createGrid(ratingSchema, [{ rating: '4/5' }], { layoutType: 'table' });
        expect(el.shadowRoot.querySelector('.rating')).not.toBeNull();
    });

    it('renders stars equal to max', () => {
        const el = createGrid(ratingSchema, [{ rating: '4/5' }], { layoutType: 'table' });
        const stars = el.shadowRoot.querySelectorAll('.rating-star');
        expect(stars).toHaveLength(5);
    });

    it('renders filled stars equal to value', () => {
        const el = createGrid(ratingSchema, [{ rating: '4/5' }], { layoutType: 'table' });
        const filled = el.shadowRoot.querySelectorAll('.rating-star:not(.empty)');
        expect(filled).toHaveLength(4);
    });

    it('renders aria-label with value and max', () => {
        const el = createGrid(ratingSchema, [{ rating: '3/5' }], { layoutType: 'table' });
        const ratingEl = el.shadowRoot.querySelector('.rating');
        expect(ratingEl.getAttribute('aria-label')).toBe('Rating: 3 out of 5');
    });

    it('renders dash for invalid rating', () => {
        const el = createGrid(ratingSchema, [{ rating: 'bad' }], { layoutType: 'table' });
        expect(el.shadowRoot.querySelector('.rating')).toBeNull();
        expect(el.shadowRoot.querySelector('td').textContent).toContain('—');
    });

    it('renders numeric rating (e.g., 3)', () => {
        const el = createGrid(ratingSchema, [{ rating: 3 }], { layoutType: 'table' });
        const filled = el.shadowRoot.querySelectorAll('.rating-star:not(.empty)');
        expect(filled).toHaveLength(3);
    });

    it('renders object rating {value, max}', () => {
        const el = createGrid(ratingSchema, [{ rating: { value: 2, max: 5 } }], { layoutType: 'table' });
        const filled = el.shadowRoot.querySelectorAll('.rating-star:not(.empty)');
        expect(filled).toHaveLength(2);
    });
});

// ─── Image column ─────────────────────────────────────────────────────────────

describe('Image column rendering', () => {
    const imageSchema = [{ key: 'img', label: 'Photo', type: 'image' }];

    it('renders <img> with table-image class in table mode', () => {
        const el = createGrid(imageSchema, [{ img: 'https://example.com/pic.jpg' }], { layoutType: 'table' });
        const img = el.shadowRoot.querySelector('img.table-image');
        expect(img).not.toBeNull();
        expect(img.getAttribute('src')).toBe('https://example.com/pic.jpg');
    });

    it('renders placeholder when src is empty', () => {
        const el = createGrid(imageSchema, [{ img: '' }], { layoutType: 'table' });
        expect(el.shadowRoot.querySelector('.table-image-placeholder')).not.toBeNull();
    });

    it('renders image with object {src, alt}', () => {
        const el = createGrid(imageSchema, [{ img: { src: 'https://x.com/x.jpg', alt: 'X' } }], { layoutType: 'table' });
        const img = el.shadowRoot.querySelector('img.table-image');
        expect(img.getAttribute('alt')).toBe('X');
    });

    it('renders grid-image class in grid mode', () => {
        const el = createGrid(imageSchema, [{ img: 'https://example.com/pic.jpg' }], { layoutType: 'grid' });
        expect(el.shadowRoot.querySelector('img.grid-image')).not.toBeNull();
    });
});

// ─── Null/missing cell values ─────────────────────────────────────────────────

describe('Null/missing cell values', () => {
    it('renders em-dash for null cell value', () => {
        const el = createGrid(textSchema, [{ name: null, price: 0 }], { layoutType: 'table' });
        const firstCell = el.shadowRoot.querySelector('tbody td');
        expect(firstCell.textContent).toContain('—');
    });

    it('renders em-dash for undefined cell value', () => {
        const el = createGrid(textSchema, [{ price: 10 }], { layoutType: 'table' });
        const firstCell = el.shadowRoot.querySelector('tbody td');
        expect(firstCell.textContent).toContain('—');
    });
});
