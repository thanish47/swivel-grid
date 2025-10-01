/**
 * StandardBundle for SwivelGrid
 * 
 * A curated bundle of essential extensions for most common use cases:
 * - LayoutRendererExtension: Table and grid rendering
 * - TemplateExtension: Cell and header template processing with pre-defined helpers
 * - SortingExtension: Column sorting functionality
 * 
 * Bundle size: ~600-650 lines (~33-38KB minified)
 * Use cases: Data tables, sortable lists, templated content display
 */

class StandardBundle {
    constructor() {
        this.name = 'standard';
        this.version = '1.0.0';
        this.extensions = [];
        this.loadedExtensions = new Set();
        this.dependencies = [
            'BaseExtension',
            'LayoutRendererExtension',
            'TemplateExtension', 
            'SortingExtension'
        ];
    }

    /**
     * Load the standard bundle into a grid instance
     * @param {SwivelGrid} gridInstance - The grid to load extensions into
     * @param {Object} options - Loading options
     * @returns {Promise<Object>} Loading result with success status and loaded extensions
     */
    async load(gridInstance, options = {}) {
        const result = {
            success: false,
            loadedExtensions: [],
            errors: [],
            bundleName: this.name,
            bundleVersion: this.version
        };

        if (!gridInstance) {
            result.errors.push('Grid instance is required');
            return result;
        }

        try {
            // Check if dependencies are available
            const missingDeps = this._checkDependencies();
            if (missingDeps.length > 0) {
                result.errors.push(`Missing dependencies: ${missingDeps.join(', ')}`);
                return result;
            }

            // Load extensions in priority order
            const extensionsToLoad = [
                { class: LayoutRendererExtension, name: 'layout-renderer', priority: 10 },
                { class: TemplateExtension, name: 'templates', priority: 20 },
                { class: SortingExtension, name: 'sorting', priority: 30 }
            ];

            // Load each extension
            for (const ext of extensionsToLoad) {
                try {
                    if (!gridInstance.hasExtension(ext.name)) {
                        const extensionInstance = new ext.class();
                        gridInstance.registerExtension(extensionInstance);
                        this.loadedExtensions.add(ext.name);
                        result.loadedExtensions.push(ext.name);
                    } else {
                        // Extension already loaded
                        result.loadedExtensions.push(`${ext.name} (already loaded)`);
                    }
                } catch (error) {
                    result.errors.push(`Failed to load ${ext.name}: ${error.message}`);
                }
            }

            result.success = result.errors.length === 0;
            
            // Store bundle metadata on grid
            gridInstance._bundleInfo = {
                name: this.name,
                version: this.version,
                loadedAt: new Date().toISOString(),
                extensions: Array.from(this.loadedExtensions)
            };

            if (result.success && options.verbose) {
                console.log(`StandardBundle v${this.version} loaded successfully with extensions:`, result.loadedExtensions);
            }

        } catch (error) {
            result.errors.push(`Bundle loading failed: ${error.message}`);
        }

        return result;
    }

    /**
     * Unload all extensions from this bundle
     * @param {SwivelGrid} gridInstance - The grid to unload extensions from
     * @returns {Object} Unloading result
     */
    unload(gridInstance) {
        const result = {
            success: false,
            unloadedExtensions: [],
            errors: []
        };

        if (!gridInstance) {
            result.errors.push('Grid instance is required');
            return result;
        }

        try {
            // Unload in reverse priority order
            const extensionsToUnload = Array.from(this.loadedExtensions).reverse();

            for (const extName of extensionsToUnload) {
                try {
                    if (gridInstance.hasExtension(extName)) {
                        gridInstance.unregisterExtension(extName);
                        result.unloadedExtensions.push(extName);
                    }
                } catch (error) {
                    result.errors.push(`Failed to unload ${extName}: ${error.message}`);
                }
            }

            this.loadedExtensions.clear();
            result.success = result.errors.length === 0;

            // Clear bundle metadata
            if (gridInstance._bundleInfo && gridInstance._bundleInfo.name === this.name) {
                delete gridInstance._bundleInfo;
            }

        } catch (error) {
            result.errors.push(`Bundle unloading failed: ${error.message}`);
        }

        return result;
    }

    /**
     * Check if all required dependencies are available
     * @returns {Array} Array of missing dependency names
     */
    _checkDependencies() {
        const missing = [];
        
        for (const dep of this.dependencies) {
            if (typeof window !== 'undefined' && !window[dep]) {
                missing.push(dep);
            } else if (typeof global !== 'undefined' && !global[dep]) {
                missing.push(dep);
            }
        }

        return missing;
    }

    /**
     * Get bundle information
     * @returns {Object} Bundle metadata
     */
    getInfo() {
        return {
            name: this.name,
            version: this.version,
            description: 'Essential extensions for common data table use cases',
            extensions: this.dependencies.slice(1), // Exclude BaseExtension
            estimatedSize: '~33-38KB minified',
            features: [
                'Table and grid layout rendering',
                'Template-based cell customization',
                'Column sorting with indicators',
                'Responsive design support',
                'Accessibility features'
            ],
            useCases: [
                'Data tables with sorting',
                'Product catalogs',
                'User listings',
                'Content management interfaces',
                'Dashboard data displays'
            ]
        };
    }

    /**
     * Check if the bundle is compatible with a grid instance
     * @param {SwivelGrid} gridInstance - Grid to check compatibility with
     * @returns {Object} Compatibility result
     */
    isCompatible(gridInstance) {
        const result = {
            compatible: false,
            version: null,
            issues: []
        };

        if (!gridInstance) {
            result.issues.push('No grid instance provided');
            return result;
        }

        // Check grid version compatibility (if available)
        if (gridInstance.version) {
            result.version = gridInstance.version;
            // Add version compatibility checks here if needed
        }

        // Check required methods exist
        const requiredMethods = ['registerExtension', 'unregisterExtension', 'hasExtension'];
        for (const method of requiredMethods) {
            if (typeof gridInstance[method] !== 'function') {
                result.issues.push(`Missing required method: ${method}`);
            }
        }

        // Check dependencies
        const missingDeps = this._checkDependencies();
        if (missingDeps.length > 0) {
            result.issues.push(`Missing dependencies: ${missingDeps.join(', ')}`);
        }

        result.compatible = result.issues.length === 0;
        return result;
    }

    /**
     * Static method to create and load a standard bundle
     * @param {SwivelGrid} gridInstance - Grid instance to load into
     * @param {Object} options - Loading options
     * @returns {Promise<Object>} Loading result
     */
    static async loadInto(gridInstance, options = {}) {
        const bundle = new StandardBundle();
        return await bundle.load(gridInstance, options);
    }

    /**
     * Get recommended configuration for this bundle
     * @returns {Object} Recommended settings
     */
    static getRecommendedConfig() {
        return {
            layoutType: 'table', // Default to table for standard use cases
            features: {
                sorting: true,
                templates: true,
                responsive: true
            },
            performance: {
                renderMode: 'standard', // Not virtualized
                updateStrategy: 'full-render'
            },
            compatibility: {
                templateBased: true // Pure template-based architecture
            }
        };
    }
}

// Export for use in both ES modules and browser globals
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StandardBundle;
} else if (typeof window !== 'undefined') {
    window.StandardBundle = StandardBundle;
}