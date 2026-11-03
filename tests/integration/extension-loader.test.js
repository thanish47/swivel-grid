import { describe, it, expect, beforeEach } from 'vitest';
import { createGridWithExtensions } from '../setup.js';

const schema = [{ key: 'name', label: 'Name' }];
const rows   = [{ name: 'Alpha' }, { name: 'Beta' }];

// ExtensionLoader is a UMD file — import as default (Vite transforms CJS)
import ExtensionLoaderModule from '../../extensions/ExtensionLoader.js';
const ExtensionLoader = ExtensionLoaderModule;

function makeGrid() {
    return createGridWithExtensions(schema, rows, []);
}

function makeLoader() {
    return new ExtensionLoader();
}

// ─── loadMinimalSetup ─────────────────────────────────────────────────────────

describe('ExtensionLoader.loadMinimalSetup', () => {
    it('registers layout-renderer extension', () => {
        const el = makeGrid();
        makeLoader().loadMinimalSetup(el);
        expect(el.hasExtension('layout-renderer')).toBe(true);
    });

    it('registers exactly 1 extension', () => {
        const el = makeGrid();
        makeLoader().loadMinimalSetup(el);
        expect(el.listExtensions()).toHaveLength(1);
    });

    it('returns array containing layout-renderer', () => {
        const el = makeGrid();
        const loaded = makeLoader().loadMinimalSetup(el);
        expect(loaded).toContain('layout-renderer');
    });

    it('does not register sorting or templates', () => {
        const el = makeGrid();
        makeLoader().loadMinimalSetup(el);
        expect(el.hasExtension('sorting')).toBe(false);
        expect(el.hasExtension('templates')).toBe(false);
    });
});

// ─── loadStandardSetup ────────────────────────────────────────────────────────

describe('ExtensionLoader.loadStandardSetup', () => {
    it('registers layout-renderer, templates, and sorting', () => {
        const el = makeGrid();
        makeLoader().loadStandardSetup(el);
        expect(el.hasExtension('layout-renderer')).toBe(true);
        expect(el.hasExtension('templates')).toBe(true);
        expect(el.hasExtension('sorting')).toBe(true);
    });

    it('registers exactly 3 extensions', () => {
        const el = makeGrid();
        makeLoader().loadStandardSetup(el);
        expect(el.listExtensions()).toHaveLength(3);
    });

    it('returns array of 3 names', () => {
        const el = makeGrid();
        const loaded = makeLoader().loadStandardSetup(el);
        expect(loaded).toHaveLength(3);
    });
});

// ─── loadAdvancedSetup ────────────────────────────────────────────────────────

describe('ExtensionLoader.loadAdvancedSetup', () => {
    it('registers all 7 extensions', () => {
        const el = makeGrid();
        makeLoader().loadAdvancedSetup(el);
        expect(el.listExtensions()).toHaveLength(7);
    });

    it('includes pagination and accessibility', () => {
        const el = makeGrid();
        makeLoader().loadAdvancedSetup(el);
        expect(el.hasExtension('pagination')).toBe(true);
        expect(el.hasExtension('accessibility')).toBe(true);
    });
});

// ─── loadCustomBundle ─────────────────────────────────────────────────────────

describe('ExtensionLoader.loadCustomBundle', () => {
    it('loads requested features plus resolved deps', () => {
        const el = makeGrid();
        const result = makeLoader().loadCustomBundle(el, ['sorting', 'search']);
        // sorting and search each need layout-renderer
        expect(el.hasExtension('layout-renderer')).toBe(true);
        expect(el.hasExtension('sorting')).toBe(true);
        expect(el.hasExtension('search')).toBe(true);
    });

    it('returns { loaded, skipped, errors }', () => {
        const el = makeGrid();
        const result = makeLoader().loadCustomBundle(el, ['layout-renderer']);
        expect(Array.isArray(result.loaded)).toBe(true);
        expect(Array.isArray(result.skipped)).toBe(true);
        expect(Array.isArray(result.errors)).toBe(true);
    });

    it('already-registered extensions go into skipped, not loaded', () => {
        const el = makeGrid();
        const loader = makeLoader();
        loader.loadCustomBundle(el, ['layout-renderer']);
        const result = loader.loadCustomBundle(el, ['layout-renderer']);
        expect(result.skipped).toContain('layout-renderer');
        expect(result.loaded).not.toContain('layout-renderer');
    });

    it('invalid feature name populates errors', () => {
        const el = makeGrid();
        const result = makeLoader().loadCustomBundle(el, ['not-a-real-feature']);
        expect(result.errors.length).toBeGreaterThan(0);
    });

    it('empty feature list loads nothing', () => {
        const el = makeGrid();
        const result = makeLoader().loadCustomBundle(el, []);
        expect(result.loaded).toHaveLength(0);
        expect(result.errors).toHaveLength(0);
    });
});

// ─── createCustomSetup ────────────────────────────────────────────────────────

describe('ExtensionLoader.createCustomSetup', () => {
    it('loads extensions from a serialized BundleBuilder config', () => {
        const config = new BundleBuilder().addFeature('sorting').toConfig();
        const el = makeGrid();
        makeLoader().createCustomSetup(el, config);
        expect(el.hasExtension('sorting')).toBe(true);
        expect(el.hasExtension('layout-renderer')).toBe(true); // auto-resolved dep
    });

    it('returns { loaded, skipped, errors }', () => {
        const config = new BundleBuilder().addFeature('layout-renderer').toConfig();
        const el = makeGrid();
        const result = makeLoader().createCustomSetup(el, config);
        expect(Array.isArray(result.loaded)).toBe(true);
        expect(Array.isArray(result.errors)).toBe(true);
    });

    it('invalid config object populates errors', () => {
        const el = makeGrid();
        const result = makeLoader().createCustomSetup(el, { broken: true });
        expect(result.errors.length).toBeGreaterThan(0);
    });
});
