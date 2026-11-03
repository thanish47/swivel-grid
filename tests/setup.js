import { afterEach, beforeEach } from 'vitest';
import { SwivelGrid } from '../SwivelGrid.js';
import { BaseExtension } from '../extensions/BaseExtension.js';
import { LayoutRendererExtension } from '../extensions/LayoutRendererExtension.js';
import { TemplateExtension } from '../extensions/TemplateExtension.js';
import { SortingExtension } from '../extensions/SortingExtension.js';
import { SearchExtension } from '../extensions/SearchExtension.js';
import { PaginationExtension } from '../extensions/PaginationExtension.js';
import { CssClassesExtension } from '../extensions/CssClassesExtension.js';
import { AccessibilityExtension } from '../extensions/AccessibilityExtension.js';
import BundleBuilderModule from '../bundles/BundleBuilder.js';
import AdvancedBundleModule from '../bundles/AdvancedBundle.js';
import StandardBundleModule from '../bundles/StandardBundle.js';
import BundleLoaderModule from '../bundles/BundleLoader.js';

// Expose extension classes globally so test files can use them as bare names
// (unit tests create extension instances without importing)
globalThis.BaseExtension = BaseExtension;
globalThis.LayoutRendererExtension = LayoutRendererExtension;
globalThis.TemplateExtension = TemplateExtension;
globalThis.SortingExtension = SortingExtension;
globalThis.SearchExtension = SearchExtension;
globalThis.PaginationExtension = PaginationExtension;
globalThis.CssClassesExtension = CssClassesExtension;
globalThis.AccessibilityExtension = AccessibilityExtension;
globalThis.BundleBuilder = BundleBuilderModule;
globalThis.AdvancedBundle = AdvancedBundleModule;
globalThis.StandardBundle = StandardBundleModule;
globalThis.BundleLoader = BundleLoaderModule;

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
 * Create a <swivel-grid> element with all core extensions pre-registered,
 * configure it, and mount it. Options are applied before data so they're
 * active during the final render.
 */
export function createGrid(schema = [], rows = [], options = {}) {
    const el = document.createElement('swivel-grid');
    document.body.appendChild(el);

    // Register core extensions (Pagination first so pageSize/totalPages setters are available)
    el.registerExtension(new PaginationExtension());
    el.registerExtension(new LayoutRendererExtension());
    el.registerExtension(new TemplateExtension());
    el.registerExtension(new SortingExtension());
    el.registerExtension(new SearchExtension());

    // Apply options before data so they're in place when render() fires
    if (options.layoutType) el.layoutType = options.layoutType;
    if (options.pageSize != null) el.pageSize = options.pageSize;
    if (options.totalPages != null) el.totalPages = options.totalPages;

    if (schema.length) el.schema = schema;
    if (rows.length) el.rows = [...rows]; // spread prevents mutation of caller's array

    return el;
}

/**
 * Create a <swivel-grid> with explicit extensions and options.
 * Useful for tests that need specific extensions or no extensions.
 */
export function createGridWithExtensions(schema = [], rows = [], extensions = [], options = {}) {
    const el = document.createElement('swivel-grid');
    document.body.appendChild(el);

    for (const ext of extensions) {
        el.registerExtension(ext);
    }

    if (options.layoutType) el.layoutType = options.layoutType;
    if (options.pageSize != null) el.pageSize = options.pageSize;
    if (options.totalPages != null) el.totalPages = options.totalPages;

    if (schema.length) el.schema = schema;
    if (rows.length) el.rows = [...rows];

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
