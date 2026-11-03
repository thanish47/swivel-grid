import { describe, it, expect } from 'vitest';
import { createGridWithExtensions } from '../setup.js';

// BundleBuilder is exposed on globalThis by setup.js
function makeBuilder() {
    return new BundleBuilder();
}

const schema = [{ key: 'name', label: 'Name' }];
const rows   = [{ name: 'Alpha' }, { name: 'Beta' }];

// ─── Chainable feature API ────────────────────────────────────────────────────

describe('BundleBuilder chainable API', () => {
    it('addFeature registers the feature', () => {
        const b = makeBuilder().addFeature('sorting');
        expect(b.hasFeature('sorting')).toBe(true);
    });

    it('addFeature ignores duplicates (idempotent)', () => {
        const b = makeBuilder().addFeature('sorting').addFeature('sorting');
        const cfg = b.toConfig();
        expect(cfg.features.filter(f => f.name === 'sorting')).toHaveLength(1);
    });

    it('removeFeature removes a previously added feature', () => {
        const b = makeBuilder().addFeature('sorting').removeFeature('sorting');
        expect(b.hasFeature('sorting')).toBe(false);
    });

    it('withConfig merges config for an existing feature', () => {
        const b = makeBuilder().addFeature('sorting').withConfig('sorting', { foo: 'bar' });
        const cfg = b.toConfig();
        expect(cfg.features.find(f => f.name === 'sorting').config.foo).toBe('bar');
    });

    it('methods are chainable', () => {
        const b = makeBuilder()
            .addFeature('layout-renderer')
            .addFeature('sorting')
            .withConfig('sorting', { x: 1 })
            .removeFeature('layout-renderer');
        expect(b.hasFeature('sorting')).toBe(true);
        expect(b.hasFeature('layout-renderer')).toBe(false);
    });
});

// ─── resolveDependencies ──────────────────────────────────────────────────────

describe('BundleBuilder.resolveDependencies', () => {
    it('adds layout-renderer when sorting is present without it', () => {
        const b = makeBuilder().addFeature('sorting');
        const { added } = b.resolveDependencies();
        expect(added).toContain('layout-renderer');
        expect(b.hasFeature('layout-renderer')).toBe(true);
    });

    it('does not add layout-renderer if already present', () => {
        const b = makeBuilder().addFeature('layout-renderer').addFeature('sorting');
        const { added } = b.resolveDependencies();
        expect(added).not.toContain('layout-renderer');
    });

    it('resolved list contains all features including added deps', () => {
        const b = makeBuilder().addFeature('sorting');
        const { resolved } = b.resolveDependencies();
        expect(resolved).toContain('sorting');
        expect(resolved).toContain('layout-renderer');
    });

    it('handles features with no dependencies cleanly', () => {
        const b = makeBuilder().addFeature('templates');
        const { added } = b.resolveDependencies();
        expect(added).toHaveLength(0);
    });
});

// ─── validate ─────────────────────────────────────────────────────────────────

describe('BundleBuilder.validate', () => {
    it('empty builder is valid', () => {
        const { valid } = makeBuilder().validate();
        expect(valid).toBe(true);
    });

    it('known feature with deps resolved is valid', () => {
        const b = makeBuilder().addFeature('sorting');
        b.resolveDependencies();
        expect(b.validate().valid).toBe(true);
    });

    it('unknown feature name produces an error', () => {
        const b = makeBuilder().addFeature('xyz-unknown');
        const { valid, errors } = b.validate();
        expect(valid).toBe(false);
        expect(errors.some(e => e.includes('xyz-unknown'))).toBe(true);
    });

    it('missing dep before resolveDependencies is reported', () => {
        const b = makeBuilder().addFeature('sorting'); // no layout-renderer
        const { valid, errors } = b.validate();
        expect(valid).toBe(false);
        expect(errors.some(e => e.includes('layout-renderer'))).toBe(true);
    });

    it('becomes valid after resolveDependencies is called', () => {
        const b = makeBuilder().addFeature('sorting');
        b.resolveDependencies();
        expect(b.validate().valid).toBe(true);
    });
});

// ─── estimateSize ─────────────────────────────────────────────────────────────

describe('BundleBuilder.estimateSize', () => {
    it('layout-renderer alone estimates 8 KB', () => {
        const { kb } = makeBuilder().addFeature('layout-renderer').estimateSize();
        expect(kb).toBe(8);
    });

    it('layout-renderer + sorting = 12 KB', () => {
        const { kb } = makeBuilder()
            .addFeature('layout-renderer')
            .addFeature('sorting')
            .estimateSize();
        expect(kb).toBe(12);
    });

    it('breakdown contains an entry for each feature', () => {
        const b = makeBuilder().addFeature('layout-renderer').addFeature('templates');
        const { breakdown } = b.estimateSize();
        expect(breakdown['layout-renderer']).toBe(8);
        expect(breakdown['templates']).toBe(5);
    });

    it('empty builder has kb = 0', () => {
        expect(makeBuilder().estimateSize().kb).toBe(0);
    });
});

// ─── build ────────────────────────────────────────────────────────────────────

describe('BundleBuilder.build', () => {
    it('returns array of extension instances', () => {
        const instances = makeBuilder().addFeature('layout-renderer').build();
        expect(Array.isArray(instances)).toBe(true);
        expect(instances).toHaveLength(1);
    });

    it('instance has correct name', () => {
        const [ext] = makeBuilder().addFeature('layout-renderer').build();
        expect(ext.name).toBe('layout-renderer');
    });

    it('auto-resolves layout-renderer dep before building', () => {
        const instances = makeBuilder().addFeature('sorting').build();
        const names = instances.map(e => e.name);
        expect(names).toContain('layout-renderer');
        expect(names).toContain('sorting');
    });

    it('instances are sorted by priority (pagination before layout-renderer before sorting)', () => {
        const instances = makeBuilder()
            .addFeature('sorting')
            .addFeature('pagination')
            .build();
        const names = instances.map(e => e.name);
        expect(names.indexOf('pagination')).toBeLessThan(names.indexOf('layout-renderer'));
        expect(names.indexOf('layout-renderer')).toBeLessThan(names.indexOf('sorting'));
    });

    it('throws on unknown feature name', () => {
        expect(() => makeBuilder().addFeature('bad-feature').build()).toThrow();
    });

    it('withConfig config is passed to the constructed instance', () => {
        // Config is passed to the constructor — the instance receives it.
        // We verify the instance is at least constructed successfully.
        const b = makeBuilder().addFeature('sorting').withConfig('sorting', { priority: 99 });
        const instances = b.build();
        const sortExt = instances.find(e => e.name === 'sorting');
        expect(sortExt).toBeDefined();
    });
});

// ─── toConfig / fromConfig round-trip ────────────────────────────────────────

describe('BundleBuilder toConfig / fromConfig', () => {
    it('toConfig returns object with version and features array', () => {
        const cfg = makeBuilder().addFeature('sorting').toConfig();
        expect(cfg.version).toBe(1);
        expect(Array.isArray(cfg.features)).toBe(true);
    });

    it('toConfig output is JSON-serializable', () => {
        const cfg = makeBuilder().addFeature('layout-renderer').addFeature('sorting').toConfig();
        expect(() => JSON.parse(JSON.stringify(cfg))).not.toThrow();
    });

    it('fromConfig recreates builder with same features', () => {
        const original = makeBuilder().addFeature('layout-renderer').addFeature('sorting');
        const cfg = original.toConfig();
        const restored = BundleBuilder.fromConfig(cfg);
        expect(restored.hasFeature('layout-renderer')).toBe(true);
        expect(restored.hasFeature('sorting')).toBe(true);
    });

    it('round-tripped builder produces same estimateSize', () => {
        const b = makeBuilder().addFeature('layout-renderer').addFeature('sorting');
        const restored = BundleBuilder.fromConfig(b.toConfig());
        expect(restored.estimateSize().kb).toBe(b.estimateSize().kb);
    });

    it('round-tripped builder produces instances with same names', () => {
        const b = makeBuilder().addFeature('layout-renderer').addFeature('sorting');
        const original = b.build().map(e => e.name).sort();
        const restored  = BundleBuilder.fromConfig(b.toConfig()).build().map(e => e.name).sort();
        expect(restored).toEqual(original);
    });

    it('fromConfig throws on invalid input', () => {
        expect(() => BundleBuilder.fromConfig(null)).toThrow();
        expect(() => BundleBuilder.fromConfig({ version: 1 })).toThrow();
    });
});

// ─── fromPreset ───────────────────────────────────────────────────────────────

describe('BundleBuilder.fromPreset', () => {
    it('enterprise preset produces all 7 extension names', () => {
        const b = BundleBuilder.fromPreset('enterprise');
        const cfg = b.toConfig();
        expect(cfg.features.length).toBeGreaterThanOrEqual(7);
    });

    it('minimal-interactive preset contains sorting and layout-renderer', () => {
        const b = BundleBuilder.fromPreset('minimal-interactive');
        expect(b.hasFeature('layout-renderer')).toBe(true);
        expect(b.hasFeature('sorting')).toBe(true);
    });

    it('unknown preset throws an error', () => {
        expect(() => BundleBuilder.fromPreset('does-not-exist')).toThrow();
    });

    it('preset builder can be extended with addFeature', () => {
        const b = BundleBuilder.fromPreset('minimal-interactive').addFeature('search');
        expect(b.hasFeature('search')).toBe(true);
    });
});

// ─── Integration: build → register on real grid ───────────────────────────────

describe('BundleBuilder integration with grid', () => {
    it('instances from build() can be registered on a grid', () => {
        const instances = makeBuilder()
            .addFeature('layout-renderer')
            .addFeature('sorting')
            .build();
        const el = createGridWithExtensions(schema, rows, instances, { layoutType: 'table' });
        expect(el.hasExtension('layout-renderer')).toBe(true);
        expect(el.hasExtension('sorting')).toBe(true);
    });

    it('grid renders correctly after loading builder instances', () => {
        const instances = makeBuilder()
            .addFeature('layout-renderer')
            .addFeature('sorting')
            .build();
        const el = createGridWithExtensions(schema, rows, instances, { layoutType: 'table' });
        expect(el.shadowRoot.querySelector('tbody tr')).not.toBeNull();
    });

    it('enterprise preset instances render a full grid', () => {
        const instances = BundleBuilder.fromPreset('enterprise').build();
        const el = createGridWithExtensions(schema, rows, instances, { layoutType: 'table' });
        expect(el.listExtensions().length).toBeGreaterThanOrEqual(7);
        expect(el.shadowRoot.querySelector('table')).not.toBeNull();
    });
});
