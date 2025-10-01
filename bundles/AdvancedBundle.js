/**
 * AdvancedBundle for SwivelGrid
 * 
 * A comprehensive bundle with all available extensions for full functionality:
 * - LayoutRendererExtension: Table and grid rendering
 * - TemplateExtension: Cell and header template processing with pre-defined helpers  
 * - SortingExtension: Column sorting functionality
 * - SearchExtension: External search input binding and filtering
 * - PaginationExtension: Infinite scroll and page-based data loading
 * - CssClassesExtension: Custom CSS class application
 * - AccessibilityExtension: ARIA labels and keyboard navigation
 * 
 * Bundle size: ~1000-1050 lines (~63-68KB minified)
 * Use cases: Enterprise data tables, complex dashboards, full-featured grids
 */

class AdvancedBundle {
    constructor() {
        this.name = 'advanced';
        this.version = '1.0.0';
        this.extensions = [];
        this.loadedExtensions = new Set();
        this.dependencies = [
            'BaseExtension',
            'LayoutRendererExtension',
            'TemplateExtension',
            'SortingExtension',
            'SearchExtension', 
            'PaginationExtension',
            'CssClassesExtension',
            'AccessibilityExtension'
        ];
    }

    /**
     * Load the advanced bundle into a grid instance
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

            // Load extensions in priority order (from BaseExtension priority values)
            const extensionsToLoad = [
                { class: PaginationExtension, name: 'pagination', priority: 5 },
                { class: LayoutRendererExtension, name: 'layout-renderer', priority: 10 },
                { class: TemplateExtension, name: 'templates', priority: 20 },
                { class: SortingExtension, name: 'sorting', priority: 30 },
                { class: SearchExtension, name: 'search', priority: 40 },
                { class: CssClassesExtension, name: 'css-classes', priority: 50 },
                { class: AccessibilityExtension, name: 'accessibility', priority: 100 }
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
                console.log(`AdvancedBundle v${this.version} loaded successfully with extensions:`, result.loadedExtensions);
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
     * Load a subset of extensions from the advanced bundle
     * @param {SwivelGrid} gridInstance - The grid to load extensions into
     * @param {Array} extensionNames - Names of extensions to load
     * @param {Object} options - Loading options
     * @returns {Promise<Object>} Loading result
     */
    async loadSubset(gridInstance, extensionNames, options = {}) {
        const result = {
            success: false,
            loadedExtensions: [],
            errors: [],
            bundleName: `${this.name}-subset`,
            bundleVersion: this.version
        };

        if (!gridInstance) {
            result.errors.push('Grid instance is required');
            return result;
        }

        if (!Array.isArray(extensionNames) || extensionNames.length === 0) {
            result.errors.push('Extension names array is required');
            return result;
        }

        try {
            // Define all available extensions
            const availableExtensions = {
                'pagination': PaginationExtension,
                'layout-renderer': LayoutRendererExtension, 
                'templates': TemplateExtension,
                'sorting': SortingExtension,
                'search': SearchExtension,
                'css-classes': CssClassesExtension,
                'accessibility': AccessibilityExtension
            };

            // Validate requested extensions
            const invalidExtensions = extensionNames.filter(name => !availableExtensions[name]);
            if (invalidExtensions.length > 0) {
                result.errors.push(`Unknown extensions: ${invalidExtensions.join(', ')}`);
                return result;
            }

            // Load requested extensions
            for (const extName of extensionNames) {
                try {
                    if (!gridInstance.hasExtension(extName)) {
                        const ExtensionClass = availableExtensions[extName];
                        const extensionInstance = new ExtensionClass();
                        gridInstance.registerExtension(extensionInstance);
                        this.loadedExtensions.add(extName);
                        result.loadedExtensions.push(extName);
                    } else {
                        result.loadedExtensions.push(`${extName} (already loaded)`);
                    }
                } catch (error) {
                    result.errors.push(`Failed to load ${extName}: ${error.message}`);
                }
            }

            result.success = result.errors.length === 0;

            if (result.success && options.verbose) {
                console.log(`AdvancedBundle subset loaded with extensions:`, result.loadedExtensions);
            }

        } catch (error) {
            result.errors.push(`Subset loading failed: ${error.message}`);
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
            description: 'Complete extension suite for enterprise-grade data grids',
            extensions: this.dependencies.slice(1), // Exclude BaseExtension
            estimatedSize: '~63-68KB minified',
            features: [
                'Table and grid layout rendering',
                'Template-based cell customization with pre-defined helpers',
                'Column sorting with template-aware comparison',
                'Search input binding and filtering',
                'Infinite scroll and pagination',
                'Custom CSS class application',
                'Full ARIA accessibility support',
                'Keyboard navigation',
                'Screen reader compatibility'
            ],
            useCases: [
                'Enterprise data tables',
                'Complex dashboards',
                'Admin interfaces',
                'Data management systems',
                'Analytics platforms',
                'Content management systems',
                'E-commerce product grids',
                'User management interfaces'
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
     * Static method to create and load an advanced bundle
     * @param {SwivelGrid} gridInstance - Grid instance to load into
     * @param {Object} options - Loading options
     * @returns {Promise<Object>} Loading result
     */
    static async loadInto(gridInstance, options = {}) {
        const bundle = new AdvancedBundle();
        return await bundle.load(gridInstance, options);
    }

    /**
     * Static method to create and load a custom subset
     * @param {SwivelGrid} gridInstance - Grid instance to load into
     * @param {Array} extensionNames - Names of extensions to load
     * @param {Object} options - Loading options
     * @returns {Promise<Object>} Loading result
     */
    static async loadSubsetInto(gridInstance, extensionNames, options = {}) {
        const bundle = new AdvancedBundle();
        return await bundle.loadSubset(gridInstance, extensionNames, options);
    }

    /**
     * Get recommended configuration for this bundle
     * @returns {Object} Recommended settings
     */
    static getRecommendedConfig() {
        return {
            layoutType: 'table', // Default to table for enterprise use
            features: {
                sorting: true,
                search: true,
                pagination: true,
                templates: true,
                accessibility: true,
                customClasses: true
            },
            performance: {
                renderMode: 'standard', // Can be upgraded to virtualized separately
                updateStrategy: 'full-render'
            },
            accessibility: {
                enabled: true,
                announceChanges: true,
                keyboardNavigation: true
            },
            compatibility: {
                templateBased: true // Pure template-based architecture
            }
        };
    }

    /**
     * Get available extension presets for common use cases
     * @returns {Object} Preset configurations
     */
    static getPresets() {
        return {
            'table-focused': ['layout-renderer', 'sorting', 'search', 'pagination'],
            'designer': ['layout-renderer', 'templates', 'css-classes'],
            'data-heavy': ['layout-renderer', 'templates', 'pagination', 'search'],
            'minimal-interactive': ['layout-renderer', 'sorting'],
            'dashboard': ['layout-renderer', 'templates', 'css-classes'],
            'enterprise': ['layout-renderer', 'templates', 'sorting', 'search', 'pagination', 'css-classes', 'accessibility']
        };
    }
}

// Export for use in both ES modules and browser globals
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdvancedBundle;
} else if (typeof window !== 'undefined') {
    window.AdvancedBundle = AdvancedBundle;
}