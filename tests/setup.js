import { afterEach, beforeEach } from 'vitest';
import { SwivelGrid } from '../SwivelGrid.js';

// Make requestAnimationFrame synchronous so scroll tests run predictably
global.requestAnimationFrame = (fn) => { fn(); return 0; };
global.cancelAnimationFrame = () => {};

// Clean DOM between tests
beforeEach(() => {
    document.body.innerHTML = '';
});

afterEach(() => {
    document.body.innerHTML = '';
});

/**
 * Create a <swivel-grid> element, configure it, and mount it.
 * Options are applied before data so they're active during the final render.
 * Rows are spread to prevent test-to-test mutation of caller arrays.
 */
export function createGrid(schema = [], rows = [], options = {}) {
    const el = document.createElement('swivel-grid');
    document.body.appendChild(el);

    // Apply options before data so they're in place when render() fires
    if (options.layoutType) el.layoutType = options.layoutType;
    if (options.pageSize != null) el.pageSize = options.pageSize;
    if (options.totalPages != null) el.totalPages = options.totalPages;

    if (schema.length) el.schema = schema;
    if (rows.length) el.rows = [...rows]; // spread prevents mutation of caller's array

    return el;
}

export const sampleSchema = [
    { key: 'name', label: 'Name' },
    { key: 'price', label: 'Price' },
    { key: 'rating', label: 'Rating', type: 'rating' },
    { key: 'image', label: 'Image', type: 'image' },
];

export const sampleRows = [
    { name: 'Alpha', price: 10, rating: '4/5', image: 'https://example.com/a.jpg' },
    { name: 'Beta',  price: 20, rating: 3,     image: { src: 'https://example.com/b.jpg', alt: 'Beta' } },
    { name: 'Gamma', price: 5,  rating: { value: 5, max: 5 }, image: '' },
];
