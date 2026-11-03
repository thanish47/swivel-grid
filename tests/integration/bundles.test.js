import { describe, it, expect } from 'vitest';
import StandardBundleModule from '../../bundles/StandardBundle.js';
import AdvancedBundleModule from '../../bundles/AdvancedBundle.js';
import BundleLoaderModule from '../../bundles/BundleLoader.js';

// The bundles are CJS modules transformed by Vite — import gives us the class.
// They reference extension classes from globalThis (set by setup.js).
const StandardBundle = StandardBundleModule;
const AdvancedBundle = AdvancedBundleModule;
const BundleLoader = BundleLoaderModule;

function makeGrid() {
    const el = document.createElement('swivel-grid');
    document.body.appendChild(el);
    return el;
}

// ─── StandardBundle ───────────────────────────────────────────────────────────

describe('StandardBundle', () => {
    it('loadInto registers layout-renderer, templates, and sorting extensions', async () => {
        const el = makeGrid();
        await StandardBundle.loadInto(el);

        expect(el.hasExtension('layout-renderer')).toBe(true);
        expect(el.hasExtension('templates')).toBe(true);
        expect(el.hasExtension('sorting')).toBe(true);
    });

    it('loadInto returns success=true with no errors', async () => {
        const el = makeGrid();
        const result = await StandardBundle.loadInto(el);
        expect(result.success).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it('renders table content correctly after bundle load', async () => {
        const el = makeGrid();
        await StandardBundle.loadInto(el);

        el.layoutType = 'table';
        el.schema = [{ key: 'name', label: 'Name' }];
        el.rows = [{ name: 'Foo' }, { name: 'Bar' }];

        expect(el.shadowRoot.querySelectorAll('tbody tr')).toHaveLength(2);
    });

    it('skips already-registered extensions without error', async () => {
        const el = makeGrid();
        el.registerExtension(new LayoutRendererExtension());

        const result = await StandardBundle.loadInto(el);
        expect(result.errors).toHaveLength(0);
    });

    it('getInfo returns bundle metadata', () => {
        const bundle = new StandardBundle();
        const info = bundle.getInfo();
        expect(info.name).toBe('standard');
        expect(Array.isArray(info.extensions)).toBe(true);
    });

    it('unload removes all bundle extensions', async () => {
        const el = makeGrid();
        const bundle = new StandardBundle();
        await bundle.load(el);
        bundle.unload(el);

        expect(el.hasExtension('layout-renderer')).toBe(false);
        expect(el.hasExtension('templates')).toBe(false);
        expect(el.hasExtension('sorting')).toBe(false);
    });
});

// ─── AdvancedBundle ───────────────────────────────────────────────────────────

describe('AdvancedBundle', () => {
    it('loadInto registers all 7 extensions', async () => {
        const el = makeGrid();
        await AdvancedBundle.loadInto(el);

        for (const name of ['layout-renderer', 'templates', 'sorting', 'search', 'pagination', 'css-classes', 'accessibility']) {
            expect(el.hasExtension(name)).toBe(true);
        }
    });

    it('loadInto returns success=true', async () => {
        const el = makeGrid();
        const result = await AdvancedBundle.loadInto(el);
        expect(result.success).toBe(true);
    });

    it('renders correctly after advanced bundle load', async () => {
        const el = makeGrid();
        await AdvancedBundle.loadInto(el);

        el.layoutType = 'table';
        el.schema = [{ key: 'val', label: 'Val' }];
        el.rows = [{ val: 'A' }, { val: 'B' }];

        const rows = el.shadowRoot.querySelectorAll('tbody tr');
        expect(rows).toHaveLength(2);
    });

    it('getInfo returns bundle metadata', () => {
        const bundle = new AdvancedBundle();
        const info = bundle.getInfo();
        expect(info.name).toBe('advanced');
        expect(Array.isArray(info.extensions)).toBe(true);
        expect(info.extensions.length).toBeGreaterThan(3);
    });

    it('loadSubsetInto loads only requested extensions', async () => {
        const el = makeGrid();
        await AdvancedBundle.loadSubsetInto(el, ['layout-renderer', 'sorting']);

        expect(el.hasExtension('layout-renderer')).toBe(true);
        expect(el.hasExtension('sorting')).toBe(true);
        expect(el.hasExtension('pagination')).toBe(false);
    });

    it('getPresets returns preset configurations', () => {
        const presets = AdvancedBundle.getPresets();
        expect(presets).toHaveProperty('enterprise');
        expect(Array.isArray(presets.enterprise)).toBe(true);
    });
});

// ─── BundleLoader.loadFromConfig ─────────────────────────────────────────────

describe('BundleLoader.loadFromConfig', () => {
    it('loads extensions defined in a BundleBuilder config', async () => {
        const el = makeGrid();
        const config = new BundleBuilder().addFeature('layout-renderer').addFeature('sorting').toConfig();
        const result = await BundleLoader.loadFromConfig(el, config);
        expect(result.success).toBe(true);
        expect(el.hasExtension('layout-renderer')).toBe(true);
        expect(el.hasExtension('sorting')).toBe(true);
    });

    it('auto-resolves dependencies from config', async () => {
        const el = makeGrid();
        // Config has sorting only — BundleBuilder.build() will resolve layout-renderer
        const config = new BundleBuilder().addFeature('sorting').toConfig();
        await BundleLoader.loadFromConfig(el, config);
        expect(el.hasExtension('layout-renderer')).toBe(true);
    });

    it('returns { success: true, loadedExtensions, errors: [] } on success', async () => {
        const el = makeGrid();
        const config = new BundleBuilder().addFeature('layout-renderer').toConfig();
        const result = await BundleLoader.loadFromConfig(el, config);
        expect(result.success).toBe(true);
        expect(Array.isArray(result.loadedExtensions)).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it('returns success: false for an invalid config', async () => {
        const el = makeGrid();
        const result = await BundleLoader.loadFromConfig(el, { broken: true });
        expect(result.success).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
    });

    it('instance method delegates to static and works the same way', async () => {
        const el = makeGrid();
        const config = new BundleBuilder().addFeature('layout-renderer').toConfig();
        const loader = new BundleLoader();
        const result = await loader.loadFromConfig(el, config);
        expect(result.success).toBe(true);
        expect(el.hasExtension('layout-renderer')).toBe(true);
    });
});

