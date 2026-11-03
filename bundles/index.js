/**
 * SwivelGrid Bundles Index
 * 
 * Centralized exports for all bundle classes and utilities.
 * Provides convenient access to bundles and loading utilities.
 */

// Import bundle classes
// Note: These would be imports in a real module system
// For browser usage, these are loaded via script tags

/**
 * Available bundle classes
 */
const Bundles = {
    Standard: typeof StandardBundle !== 'undefined' ? StandardBundle : null,
    Advanced: typeof AdvancedBundle !== 'undefined' ? AdvancedBundle : null,
    Loader: typeof BundleLoader !== 'undefined' ? BundleLoader : null
};

/**
 * Quick access methods for common operations
 */
const SwivelGridBundles = {
    
    /**
     * Load standard bundle (most common use case)
     * @param {SwivelGrid} gridInstance - Grid instance
     * @param {Object} options - Loading options
     * @returns {Promise<Object>} Loading result
     */
    loadStandard: async function(gridInstance, options = {}) {
        if (!Bundles.Standard) {
            throw new Error('StandardBundle not available. Make sure StandardBundle.js is loaded.');
        }
        return await Bundles.Standard.loadInto(gridInstance, options);
    },

    /**
     * Load advanced bundle (full feature set)
     * @param {SwivelGrid} gridInstance - Grid instance
     * @param {Object} options - Loading options
     * @returns {Promise<Object>} Loading result
     */
    loadAdvanced: async function(gridInstance, options = {}) {
        if (!Bundles.Advanced) {
            throw new Error('AdvancedBundle not available. Make sure AdvancedBundle.js is loaded.');
        }
        return await Bundles.Advanced.loadInto(gridInstance, options);
    },

    /**
     * Load by use case (auto-select best bundle)
     * @param {SwivelGrid} gridInstance - Grid instance
     * @param {string} useCase - Use case identifier
     * @param {Object} options - Loading options
     * @returns {Promise<Object>} Loading result
     */
    loadForUseCase: async function(gridInstance, useCase, options = {}) {
        if (!Bundles.Loader) {
            throw new Error('BundleLoader not available. Make sure BundleLoader.js is loaded.');
        }
        return await Bundles.Loader.quickLoadForUseCase(gridInstance, useCase, options);
    },

    /**
     * Load preset configuration
     * @param {SwivelGrid} gridInstance - Grid instance
     * @param {string} presetName - Preset name
     * @param {Object} options - Loading options
     * @returns {Promise<Object>} Loading result
     */
    loadPreset: async function(gridInstance, presetName, options = {}) {
        if (!Bundles.Loader) {
            throw new Error('BundleLoader not available. Make sure BundleLoader.js is loaded.');
        }
        const loader = new Bundles.Loader();
        return await loader.loadPreset(gridInstance, presetName, options);
    },

    /**
     * Load custom extension combination
     * @param {SwivelGrid} gridInstance - Grid instance
     * @param {Array} extensionNames - Extension names to load
     * @param {Object} options - Loading options
     * @returns {Promise<Object>} Loading result
     */
    loadCustom: async function(gridInstance, extensionNames, options = {}) {
        if (!Bundles.Advanced) {
            throw new Error('AdvancedBundle not available. Make sure AdvancedBundle.js is loaded.');
        }
        return await Bundles.Advanced.loadSubsetInto(gridInstance, extensionNames, options);
    },

    /**
     * Get bundle recommendations based on requirements
     * @param {Object} requirements - Feature requirements
     * @returns {Object} Bundle recommendation
     */
    recommend: function(requirements = {}) {
        if (!Bundles.Loader) {
            throw new Error('BundleLoader not available. Make sure BundleLoader.js is loaded.');
        }
        const loader = new Bundles.Loader();
        return loader.recommendBundle(requirements);
    },

    /**
     * Get information about all available bundles
     * @returns {Object} Bundle information
     */
    getInfo: function() {
        if (!Bundles.Loader) {
            throw new Error('BundleLoader not available. Make sure BundleLoader.js is loaded.');
        }
        const loader = new Bundles.Loader();
        return {
            bundles: loader.getBundleInfo(),
            presets: loader.getPresets(),
            useCases: loader.getUseCaseRecommendations(),
            sizes: loader.getBundleSizes()
        };
    },

    /**
     * Get available use cases
     * @returns {Array} Available use case names
     */
    getUseCases: function() {
        if (!Bundles.Loader) {
            throw new Error('BundleLoader not available. Make sure BundleLoader.js is loaded.');
        }
        const loader = new Bundles.Loader();
        return Object.keys(loader.getUseCaseRecommendations());
    },

    /**
     * Get available presets
     * @returns {Array} Available preset names
     */
    getPresets: function() {
        if (!Bundles.Advanced) {
            throw new Error('AdvancedBundle not available. Make sure AdvancedBundle.js is loaded.');
        }
        return Object.keys(Bundles.Advanced.getPresets());
    },

    /**
     * Check if a bundle is compatible with a grid
     * @param {SwivelGrid} gridInstance - Grid instance
     * @param {string} bundleName - Bundle name
     * @returns {Object} Compatibility result
     */
    checkCompatibility: function(gridInstance, bundleName) {
        if (!Bundles.Loader) {
            throw new Error('BundleLoader not available. Make sure BundleLoader.js is loaded.');
        }
        const loader = new Bundles.Loader();
        return loader.checkCompatibility(gridInstance, bundleName);
    }
};

/**
 * Usage examples in comments:
 * 
 * // Load standard bundle
 * await SwivelGridBundles.loadStandard(myGrid);
 * 
 * // Load for specific use case
 * await SwivelGridBundles.loadForUseCase(myGrid, 'admin-interface');
 * 
 * // Load custom combination
 * await SwivelGridBundles.loadCustom(myGrid, ['layout-renderer', 'sorting', 'search']);
 * 
 * // Get recommendations
 * const rec = SwivelGridBundles.recommend({ 
 *   needsSorting: true, 
 *   needsSearch: true, 
 *   prioritizeSize: false 
 * });
 * 
 * // Get all available info
 * const info = SwivelGridBundles.getInfo();
 */

// Export for use in both ES modules and browser globals
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        StandardBundle: Bundles.Standard,
        AdvancedBundle: Bundles.Advanced,
        BundleLoader: Bundles.Loader,
        SwivelGridBundles
    };
} else if (typeof window !== 'undefined') {
    window.SwivelGridBundles = SwivelGridBundles;
}