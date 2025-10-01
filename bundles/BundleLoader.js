/**
 * BundleLoader for SwivelGrid
 * 
 * A utility class to simplify loading and managing extension bundles.
 * Provides convenient methods for common bundle operations and configurations.
 */

class BundleLoader {
    constructor() {
        this.availableBundles = {
            'standard': StandardBundle,
            'advanced': AdvancedBundle
        };
        this.loadHistory = [];
    }

    /**
     * Auto-detect and load the best bundle for a use case
     * @param {SwivelGrid} gridInstance - Grid instance
     * @param {string} useCase - Use case identifier
     * @param {Object} options - Loading options
     * @returns {Promise<Object>} Loading result
     */
    async loadForUseCase(gridInstance, useCase, options = {}) {
        const useCaseMap = {
            'data-table': { bundle: 'standard', preset: null },
            'sortable-list': { bundle: 'standard', preset: null },
            'product-catalog': { bundle: 'standard', preset: null },
            'dashboard': { bundle: 'advanced', preset: 'dashboard' },
            'admin-interface': { bundle: 'advanced', preset: 'enterprise' },
            'content-management': { bundle: 'advanced', preset: 'table-focused' },
            'user-listing': { bundle: 'standard', preset: null },
            'analytics': { bundle: 'advanced', preset: 'data-heavy' },
            'minimal': { bundle: 'advanced', preset: 'minimal-interactive' },
            'enterprise': { bundle: 'advanced', preset: 'enterprise' }
        };

        const config = useCaseMap[useCase];
        if (!config) {
            return {
                success: false,
                errors: [`Unknown use case: ${useCase}. Available: ${Object.keys(useCaseMap).join(', ')}`]
            };
        }

        // Load bundle or preset
        if (config.preset) {
            return await this.loadPreset(gridInstance, config.preset, options);
        } else {
            return await this.loadBundle(gridInstance, config.bundle, options);
        }
    }

    /**
     * Load a specific bundle
     * @param {SwivelGrid} gridInstance - Grid instance
     * @param {string} bundleName - Name of bundle to load
     * @param {Object} options - Loading options
     * @returns {Promise<Object>} Loading result
     */
    async loadBundle(gridInstance, bundleName, options = {}) {
        const BundleClass = this.availableBundles[bundleName];
        if (!BundleClass) {
            return {
                success: false,
                errors: [`Unknown bundle: ${bundleName}. Available: ${Object.keys(this.availableBundles).join(', ')}`]
            };
        }

        const bundle = new BundleClass();
        const result = await bundle.load(gridInstance, options);
        
        // Record load operation
        this.loadHistory.push({
            timestamp: new Date().toISOString(),
            bundleName,
            gridId: gridInstance.id || 'unknown',
            success: result.success,
            extensionsLoaded: result.loadedExtensions
        });

        return result;
    }

    /**
     * Load a preset configuration from AdvancedBundle
     * @param {SwivelGrid} gridInstance - Grid instance
     * @param {string} presetName - Name of preset to load
     * @param {Object} options - Loading options
     * @returns {Promise<Object>} Loading result
     */
    async loadPreset(gridInstance, presetName, options = {}) {
        const presets = AdvancedBundle.getPresets();
        const extensionNames = presets[presetName];
        
        if (!extensionNames) {
            return {
                success: false,
                errors: [`Unknown preset: ${presetName}. Available: ${Object.keys(presets).join(', ')}`]
            };
        }

        const result = await AdvancedBundle.loadSubsetInto(gridInstance, extensionNames, options);
        
        // Record load operation
        this.loadHistory.push({
            timestamp: new Date().toISOString(),
            bundleName: `advanced-preset-${presetName}`,
            gridId: gridInstance.id || 'unknown',
            success: result.success,
            extensionsLoaded: result.loadedExtensions
        });

        return result;
    }

    /**
     * Load custom extension combination
     * @param {SwivelGrid} gridInstance - Grid instance
     * @param {Array} extensionNames - Array of extension names
     * @param {Object} options - Loading options
     * @returns {Promise<Object>} Loading result
     */
    async loadCustom(gridInstance, extensionNames, options = {}) {
        if (!Array.isArray(extensionNames) || extensionNames.length === 0) {
            return {
                success: false,
                errors: ['Extension names array is required']
            };
        }

        const result = await AdvancedBundle.loadSubsetInto(gridInstance, extensionNames, options);
        
        // Record load operation
        this.loadHistory.push({
            timestamp: new Date().toISOString(),
            bundleName: `custom-${extensionNames.join('-')}`,
            gridId: gridInstance.id || 'unknown',
            success: result.success,
            extensionsLoaded: result.loadedExtensions
        });

        return result;
    }

    /**
     * Get information about all available bundles
     * @returns {Object} Bundle information
     */
    getBundleInfo() {
        const info = {};
        for (const [name, BundleClass] of Object.entries(this.availableBundles)) {
            const bundle = new BundleClass();
            info[name] = bundle.getInfo();
        }
        return info;
    }

    /**
     * Get available presets
     * @returns {Object} Preset configurations
     */
    getPresets() {
        return AdvancedBundle.getPresets();
    }

    /**
     * Get use case recommendations
     * @returns {Object} Use case to bundle/preset mapping
     */
    getUseCaseRecommendations() {
        return {
            'data-table': {
                bundle: 'standard',
                description: 'Simple sortable table with templates',
                extensions: ['layout-renderer', 'templates', 'sorting']
            },
            'sortable-list': {
                bundle: 'standard', 
                description: 'Basic grid with sorting functionality',
                extensions: ['layout-renderer', 'templates', 'sorting']
            },
            'product-catalog': {
                bundle: 'standard',
                description: 'Grid layout with template-based product display',
                extensions: ['layout-renderer', 'templates', 'sorting']
            },
            'dashboard': {
                bundle: 'advanced',
                preset: 'dashboard',
                description: 'Grid with templates and custom styling',
                extensions: ['layout-renderer', 'templates', 'css-classes']
            },
            'admin-interface': {
                bundle: 'advanced',
                preset: 'enterprise', 
                description: 'Full-featured table with accessibility',
                extensions: ['layout-renderer', 'templates', 'sorting', 'search', 'pagination', 'css-classes', 'accessibility']
            },
            'content-management': {
                bundle: 'advanced',
                preset: 'table-focused',
                description: 'Table with search, sort, and pagination',
                extensions: ['layout-renderer', 'sorting', 'search', 'pagination']
            },
            'analytics': {
                bundle: 'advanced',
                preset: 'data-heavy',
                description: 'Optimized for large datasets',
                extensions: ['layout-renderer', 'templates', 'pagination', 'search']
            }
        };
    }

    /**
     * Validate bundle compatibility with a grid
     * @param {SwivelGrid} gridInstance - Grid instance
     * @param {string} bundleName - Bundle name to check
     * @returns {Object} Compatibility result
     */
    checkCompatibility(gridInstance, bundleName) {
        const BundleClass = this.availableBundles[bundleName];
        if (!BundleClass) {
            return {
                compatible: false,
                issues: [`Unknown bundle: ${bundleName}`]
            };
        }

        const bundle = new BundleClass();
        return bundle.isCompatible(gridInstance);
    }

    /**
     * Get loading history
     * @returns {Array} Array of load operations
     */
    getLoadHistory() {
        return [...this.loadHistory];
    }

    /**
     * Clear loading history
     */
    clearLoadHistory() {
        this.loadHistory = [];
    }

    /**
     * Get bundle size estimates
     * @returns {Object} Size information for each bundle
     */
    getBundleSizes() {
        return {
            'core-only': {
                estimatedSize: '~18KB minified',
                lineCount: '~831 lines',
                description: 'SwivelGrid core without extensions'
            },
            'standard': {
                estimatedSize: '~33-38KB minified',
                lineCount: '~600-650 lines',
                description: 'Core + LayoutRenderer + Templates + Sorting'
            },
            'advanced': {
                estimatedSize: '~63-68KB minified', 
                lineCount: '~1000-1050 lines',
                description: 'All extensions included'
            }
        };
    }

    /**
     * Recommend optimal bundle for specific requirements
     * @param {Object} requirements - Feature requirements
     * @returns {Object} Bundle recommendation
     */
    recommendBundle(requirements = {}) {
        const {
            needsSorting = false,
            needsSearch = false,
            needsPagination = false,
            needsTemplates = false,
            needsAccessibility = false,
            needsCustomStyling = false,
            prioritizeSize = false
        } = requirements;

        // Calculate feature score
        const advancedFeatures = [needsSearch, needsPagination, needsAccessibility, needsCustomStyling].filter(Boolean).length;
        const basicFeatures = [needsSorting, needsTemplates].filter(Boolean).length;

        let recommendation;

        if (prioritizeSize && basicFeatures <= 2 && advancedFeatures === 0) {
            recommendation = {
                bundle: 'standard',
                preset: null,
                reason: 'Size optimization with basic features'
            };
        } else if (advancedFeatures >= 2 || (advancedFeatures >= 1 && !prioritizeSize)) {
            recommendation = {
                bundle: 'advanced',
                preset: 'enterprise',
                reason: 'Multiple advanced features required'
            };
        } else if (needsTemplates && needsSorting) {
            recommendation = {
                bundle: 'standard',
                preset: null,
                reason: 'Template-based sorting is optimal'
            };
        } else {
            recommendation = {
                bundle: 'advanced',
                preset: 'minimal-interactive',
                reason: 'Minimal feature set with growth flexibility'
            };
        }

        return {
            ...recommendation,
            estimatedSize: this.getBundleSizes()[recommendation.bundle].estimatedSize,
            features: this._getFeaturesForRecommendation(recommendation)
        };
    }

    /**
     * Get features included in a recommendation
     * @private
     */
    _getFeaturesForRecommendation(recommendation) {
        if (recommendation.bundle === 'standard') {
            return ['Table/Grid Rendering', 'Templates', 'Sorting'];
        }
        
        const presets = this.getPresets();
        const extensions = presets[recommendation.preset] || Object.keys(presets.enterprise);
        
        const featureMap = {
            'layout-renderer': 'Table/Grid Rendering',
            'templates': 'Templates',
            'sorting': 'Sorting', 
            'search': 'Search',
            'pagination': 'Pagination',
            'css-classes': 'Custom Styling',
            'accessibility': 'Accessibility'
        };

        return extensions.map(ext => featureMap[ext]).filter(Boolean);
    }

    /**
     * Static method to create a bundle loader and load a bundle in one step
     * @param {SwivelGrid} gridInstance - Grid instance
     * @param {string} bundleName - Bundle to load
     * @param {Object} options - Loading options
     * @returns {Promise<Object>} Loading result
     */
    static async quickLoad(gridInstance, bundleName, options = {}) {
        const loader = new BundleLoader();
        return await loader.loadBundle(gridInstance, bundleName, options);
    }

    /**
     * Static method to load bundle by use case
     * @param {SwivelGrid} gridInstance - Grid instance  
     * @param {string} useCase - Use case name
     * @param {Object} options - Loading options
     * @returns {Promise<Object>} Loading result
     */
    static async quickLoadForUseCase(gridInstance, useCase, options = {}) {
        const loader = new BundleLoader();
        return await loader.loadForUseCase(gridInstance, useCase, options);
    }
}

// Export for use in both ES modules and browser globals
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BundleLoader;
} else if (typeof window !== 'undefined') {
    window.BundleLoader = BundleLoader;
}