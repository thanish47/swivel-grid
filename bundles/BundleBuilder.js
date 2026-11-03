/**
 * BundleBuilder for SwivelGrid
 *
 * Chainable utility for composing custom extension bundles with automatic
 * dependency resolution, validation, size estimation, and serialization.
 */

const EXTENSION_REGISTRY = {
    'layout-renderer': 'LayoutRendererExtension',
    'templates':       'TemplateExtension',
    'sorting':         'SortingExtension',
    'search':          'SearchExtension',
    'pagination':      'PaginationExtension',
    'css-classes':     'CssClassesExtension',
    'accessibility':   'AccessibilityExtension',
};

const DEPENDENCIES = {
    'layout-renderer': [],
    'templates':       [],
    'sorting':         ['layout-renderer'],
    'search':          ['layout-renderer'],
    'pagination':      ['layout-renderer'],
    'css-classes':     ['layout-renderer'],
    'accessibility':   ['layout-renderer'],
};

const CONFLICTS = {};

const SIZE_KB = {
    'layout-renderer': 8,
    'templates':       5,
    'sorting':         4,
    'search':          3,
    'pagination':      6,
    'css-classes':     3,
    'accessibility':   4,
};

const PRIORITY = {
    'pagination':      5,
    'layout-renderer': 10,
    'templates':       20,
    'sorting':         30,
    'search':          40,
    'css-classes':     50,
    'accessibility':   100,
};

function _resolveClass(className) {
    if (typeof globalThis !== 'undefined' && globalThis[className]) return globalThis[className];
    if (typeof window   !== 'undefined' && window[className])   return window[className];
    if (typeof global   !== 'undefined' && global[className])   return global[className];
    return null;
}

class BundleBuilder {
    constructor() {
        this._features = [];
        this._featureNames = new Set();
    }

    /**
     * Add a feature by name.
     * @param {string} name - Feature name (e.g. 'sorting')
     * @param {Object} config - Optional config passed to the extension constructor
     * @returns {BundleBuilder} this (chainable)
     */
    addFeature(name, config = {}) {
        if (!this._featureNames.has(name)) {
            this._features.push({ name, config });
            this._featureNames.add(name);
        }
        return this;
    }

    /**
     * Remove a feature by name.
     * @param {string} name
     * @returns {BundleBuilder} this (chainable)
     */
    removeFeature(name) {
        this._features = this._features.filter(f => f.name !== name);
        this._featureNames.delete(name);
        return this;
    }

    /**
     * Merge additional config for an already-added feature.
     * @param {string} featureName
     * @param {Object} config
     * @returns {BundleBuilder} this (chainable)
     */
    withConfig(featureName, config) {
        const feature = this._features.find(f => f.name === featureName);
        if (feature) {
            feature.config = { ...feature.config, ...config };
        }
        return this;
    }

    /**
     * Check whether a feature has been added.
     * @param {string} name
     * @returns {boolean}
     */
    hasFeature(name) {
        return this._featureNames.has(name);
    }

    /**
     * Resolve missing dependencies and add them to the feature list.
     * Mutates internal state.
     * @returns {{ resolved: string[], added: string[] }}
     */
    resolveDependencies() {
        const added = [];

        // Iterate over a snapshot — we may grow _features during the loop
        let i = 0;
        while (i < this._features.length) {
            const { name } = this._features[i];
            const deps = DEPENDENCIES[name] || [];
            for (const dep of deps) {
                if (!this._featureNames.has(dep)) {
                    this._features.unshift({ name: dep, config: {} });
                    this._featureNames.add(dep);
                    added.push(dep);
                    i++; // account for the prepended entry
                }
            }
            i++;
        }

        const resolved = [...this._featureNames];
        return { resolved, added };
    }

    /**
     * Validate the current feature set (after resolveDependencies has been called).
     * @returns {{ valid: boolean, errors: string[] }}
     */
    validate() {
        const errors = [];

        for (const { name } of this._features) {
            if (!EXTENSION_REGISTRY[name]) {
                errors.push(`Unknown feature: "${name}"`);
                continue;
            }

            // Check all deps are present (warn if resolve hasn't been called)
            const deps = DEPENDENCIES[name] || [];
            for (const dep of deps) {
                if (!this._featureNames.has(dep)) {
                    errors.push(`Feature "${name}" requires "${dep}" but it is not included`);
                }
            }

            // Check conflicts
            const conflictsFor = CONFLICTS[name] || [];
            for (const conflict of conflictsFor) {
                if (this._featureNames.has(conflict)) {
                    errors.push(`Feature "${name}" conflicts with "${conflict}"`);
                }
            }
        }

        return { valid: errors.length === 0, errors };
    }

    /**
     * Estimate the total bundle size.
     * @returns {{ kb: number, breakdown: Object<string, number> }}
     */
    estimateSize() {
        const breakdown = {};
        let kb = 0;
        for (const { name } of this._features) {
            const size = SIZE_KB[name] ?? 0;
            breakdown[name] = size;
            kb += size;
        }
        return { kb, breakdown };
    }

    /**
     * Resolve dependencies, validate, then instantiate and return extension instances
     * sorted by priority (lowest priority number first).
     * @returns {BaseExtension[]}
     * @throws {Error} if validation fails or a class is not found in global scope
     */
    build() {
        this.resolveDependencies();
        const { valid, errors } = this.validate();
        if (!valid) {
            throw new Error(`BundleBuilder.build() failed: ${errors.join('; ')}`);
        }

        const sorted = [...this._features].sort(
            (a, b) => (PRIORITY[a.name] ?? 99) - (PRIORITY[b.name] ?? 99)
        );

        return sorted.map(({ name, config }) => {
            const className = EXTENSION_REGISTRY[name];
            const ExtClass = _resolveClass(className);
            if (!ExtClass) {
                throw new Error(`BundleBuilder: "${className}" not found in global scope. Ensure extensions are loaded before calling build().`);
            }
            return new ExtClass(config);
        });
    }

    /**
     * Serialize the builder state to a plain object (safe to JSON.stringify).
     * @returns {{ version: number, features: Array<{name: string, config: Object}> }}
     */
    toConfig() {
        return {
            version: 1,
            features: this._features.map(({ name, config }) => ({ name, config: { ...config } })),
        };
    }

    /**
     * Create a BundleBuilder pre-populated from one of the AdvancedBundle presets.
     * @param {string} presetName
     * @returns {BundleBuilder}
     * @throws {Error} if preset name is unknown
     */
    static fromPreset(presetName) {
        // AdvancedBundle is a global in the bundle context
        const AdvancedBundleClass = _resolveClass('AdvancedBundle');
        const presets = AdvancedBundleClass
            ? AdvancedBundleClass.getPresets()
            : _getBuiltInPresets();

        const featureNames = presets[presetName];
        if (!featureNames) {
            throw new Error(`BundleBuilder.fromPreset: unknown preset "${presetName}". Available: ${Object.keys(presets).join(', ')}`);
        }

        const builder = new BundleBuilder();
        for (const name of featureNames) {
            builder.addFeature(name);
        }
        return builder;
    }

    /**
     * Restore a BundleBuilder from a serialized config object (output of toConfig()).
     * @param {{ version: number, features: Array<{name: string, config: Object}> }} configObj
     * @returns {BundleBuilder}
     */
    static fromConfig(configObj) {
        if (!configObj || !Array.isArray(configObj.features)) {
            throw new Error('BundleBuilder.fromConfig: invalid config object');
        }
        const builder = new BundleBuilder();
        for (const { name, config = {} } of configObj.features) {
            builder.addFeature(name, config);
        }
        return builder;
    }
}

// Built-in preset fallback (matches AdvancedBundle.getPresets()) used when AdvancedBundle is not in scope
function _getBuiltInPresets() {
    return {
        'table-focused':      ['layout-renderer', 'sorting', 'search', 'pagination'],
        'designer':           ['layout-renderer', 'templates', 'css-classes'],
        'data-heavy':         ['layout-renderer', 'templates', 'pagination', 'search'],
        'minimal-interactive':['layout-renderer', 'sorting'],
        'dashboard':          ['layout-renderer', 'templates', 'css-classes'],
        'enterprise':         ['layout-renderer', 'templates', 'sorting', 'search', 'pagination', 'css-classes', 'accessibility'],
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = BundleBuilder;
} else if (typeof window !== 'undefined') {
    window.BundleBuilder = BundleBuilder;
}
