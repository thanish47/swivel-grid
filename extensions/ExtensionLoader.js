/**
 * Extension Loader Utility for SwivelGrid
 * Provides convenient methods for loading and managing extensions
 */
class ExtensionLoader {
    constructor() {
        this.loadedExtensions = new Map();
    }

    /**
     * Load a single extension and register it with a grid
     * @param {SwivelGrid} grid - The grid instance
     * @param {BaseExtension|Function} Extension - Extension instance or constructor
     * @param {Object} config - Configuration options for the extension
     * @returns {boolean} Success status
     */
    loadExtension(grid, Extension, config = {}) {
        try {
            let extension;
            
            if (typeof Extension === 'function') {
                // Extension is a constructor
                extension = new Extension(config);
            } else if (Extension && typeof Extension === 'object') {
                // Extension is already an instance
                extension = Extension;
            } else {
                console.error('ExtensionLoader: Invalid extension provided');
                return false;
            }
            
            const success = grid.registerExtension(extension);
            if (success) {
                this.loadedExtensions.set(extension.name, extension);
            }
            
            return success;
        } catch (error) {
            console.error(`ExtensionLoader: Error loading extension:`, error);
            return false;
        }
    }

    /**
     * Load multiple extensions
     * @param {SwivelGrid} grid - The grid instance
     * @param {Array} extensions - Array of extension definitions
     * @returns {Array} Array of loaded extension names
     */
    loadExtensions(grid, extensions) {
        const loaded = [];
        
        for (const extensionDef of extensions) {
            const { Extension, config = {}, priority = 0 } = extensionDef;
            
            if (this.loadExtension(grid, Extension, { ...config, priority })) {
                loaded.push(extensionDef.name || Extension.name);
            }
        }
        
        return loaded;
    }

    /**
     * Load extensions from a bundle
     * @param {SwivelGrid} grid - The grid instance
     * @param {Object} bundle - Extension bundle object
     * @returns {Array} Array of loaded extension names
     */
    loadBundle(grid, bundle) {
        if (!bundle || !bundle.extensions) {
            console.error('ExtensionLoader: Invalid bundle format');
            return [];
        }
        
        return this.loadExtensions(grid, bundle.extensions);
    }

    /**
     * Unload an extension from a grid
     * @param {SwivelGrid} grid - The grid instance
     * @param {string} extensionName - Name of the extension to unload
     * @returns {boolean} Success status
     */
    unloadExtension(grid, extensionName) {
        const success = grid.unregisterExtension(extensionName);
        if (success) {
            this.loadedExtensions.delete(extensionName);
        }
        return success;
    }

    /**
     * Unload all extensions from a grid
     * @param {SwivelGrid} grid - The grid instance
     * @returns {number} Number of extensions unloaded
     */
    unloadAllExtensions(grid) {
        const extensionNames = grid.listExtensions();
        let unloaded = 0;
        
        for (const name of extensionNames) {
            if (this.unloadExtension(grid, name)) {
                unloaded++;
            }
        }
        
        return unloaded;
    }

    /**
     * Get information about a loaded extension
     * @param {string} extensionName - Name of the extension
     * @returns {Object|null} Extension info or null if not found
     */
    getExtensionInfo(extensionName) {
        const extension = this.loadedExtensions.get(extensionName);
        if (!extension) return null;
        
        return {
            name: extension.name,
            enabled: extension.enabled,
            priority: extension.priority,
            type: extension.constructor.name
        };
    }

    /**
     * List all loaded extensions
     * @returns {Array} Array of extension info objects
     */
    listLoadedExtensions() {
        return Array.from(this.loadedExtensions.values()).map(extension => ({
            name: extension.name,
            enabled: extension.enabled,
            priority: extension.priority,
            type: extension.constructor.name
        }));
    }

    /**
     * Enable or disable an extension
     * @param {string} extensionName - Name of the extension
     * @param {boolean} enabled - Enable/disable state
     * @returns {boolean} Success status
     */
    setExtensionEnabled(extensionName, enabled) {
        const extension = this.loadedExtensions.get(extensionName);
        if (!extension) return false;
        
        extension.setEnabled(enabled);
        return true;
    }

    /**
     * Set extension priority (affects execution order)
     * @param {string} extensionName - Name of the extension
     * @param {number} priority - Priority value (lower = higher priority)
     * @returns {boolean} Success status
     */
    setExtensionPriority(extensionName, priority) {
        const extension = this.loadedExtensions.get(extensionName);
        if (!extension) return false;
        
        extension.setPriority(priority);
        return true;
    }

    /**
     * Load only the layout-renderer extension — the smallest usable grid.
     * @param {SwivelGrid} grid
     * @returns {Array} Array of loaded extension names
     */
    loadMinimalSetup(grid) {
        const defs = [
            { Extension: _resolveGlobal('LayoutRendererExtension'), name: 'layout-renderer' },
        ].filter(d => d.Extension);
        return this.loadExtensions(grid, defs);
    }

    /**
     * Load the standard set: layout-renderer + templates + sorting.
     * Matches StandardBundle composition.
     * @param {SwivelGrid} grid
     * @returns {Array} Array of loaded extension names
     */
    loadStandardSetup(grid) {
        const defs = [
            { Extension: _resolveGlobal('LayoutRendererExtension'), name: 'layout-renderer' },
            { Extension: _resolveGlobal('TemplateExtension'),       name: 'templates' },
            { Extension: _resolveGlobal('SortingExtension'),        name: 'sorting' },
        ].filter(d => d.Extension);
        return this.loadExtensions(grid, defs);
    }

    /**
     * Load all seven extensions in priority order.
     * Matches AdvancedBundle composition.
     * @param {SwivelGrid} grid
     * @returns {Array} Array of loaded extension names
     */
    loadAdvancedSetup(grid) {
        const defs = [
            { Extension: _resolveGlobal('PaginationExtension'),     name: 'pagination' },
            { Extension: _resolveGlobal('LayoutRendererExtension'), name: 'layout-renderer' },
            { Extension: _resolveGlobal('TemplateExtension'),       name: 'templates' },
            { Extension: _resolveGlobal('SortingExtension'),        name: 'sorting' },
            { Extension: _resolveGlobal('SearchExtension'),         name: 'search' },
            { Extension: _resolveGlobal('CssClassesExtension'),     name: 'css-classes' },
            { Extension: _resolveGlobal('AccessibilityExtension'),  name: 'accessibility' },
        ].filter(d => d.Extension);
        return this.loadExtensions(grid, defs);
    }

    /**
     * Load a custom set of features by name, auto-resolving dependencies via BundleBuilder.
     * @param {SwivelGrid} grid
     * @param {string[]} featureList - e.g. ['sorting', 'search']
     * @param {Object} config - Optional per-feature config keyed by feature name
     * @returns {{ loaded: string[], skipped: string[], errors: string[] }}
     */
    loadCustomBundle(grid, featureList, config = {}) {
        const result = { loaded: [], skipped: [], errors: [] };

        const BBClass = _resolveGlobal('BundleBuilder');
        if (!BBClass) {
            result.errors.push('BundleBuilder not found in global scope');
            return result;
        }

        let instances;
        try {
            const builder = new BBClass();
            for (const name of featureList) {
                builder.addFeature(name, config[name] || {});
            }
            instances = builder.build();
        } catch (err) {
            result.errors.push(err.message);
            return result;
        }

        for (const ext of instances) {
            if (grid.hasExtension(ext.name)) {
                result.skipped.push(ext.name);
            } else {
                const ok = this.loadExtension(grid, ext);
                if (ok) {
                    result.loaded.push(ext.name);
                } else {
                    result.errors.push(`Failed to register "${ext.name}"`);
                }
            }
        }

        return result;
    }

    /**
     * Restore a custom bundle from a serialized BundleBuilder config and load it.
     * @param {SwivelGrid} grid
     * @param {{ version: number, features: Array }} configObj - Output of BundleBuilder.toConfig()
     * @returns {{ loaded: string[], skipped: string[], errors: string[] }}
     */
    createCustomSetup(grid, configObj) {
        const result = { loaded: [], skipped: [], errors: [] };

        const BBClass = _resolveGlobal('BundleBuilder');
        if (!BBClass) {
            result.errors.push('BundleBuilder not found in global scope');
            return result;
        }

        let instances;
        try {
            const builder = BBClass.fromConfig(configObj);
            instances = builder.build();
        } catch (err) {
            result.errors.push(err.message);
            return result;
        }

        for (const ext of instances) {
            if (grid.hasExtension(ext.name)) {
                result.skipped.push(ext.name);
            } else {
                const ok = this.loadExtension(grid, ext);
                if (ok) {
                    result.loaded.push(ext.name);
                } else {
                    result.errors.push(`Failed to register "${ext.name}"`);
                }
            }
        }

        return result;
    }

    /**
     * Dynamically import an extension module and register it with the grid.
     * @param {SwivelGrid} grid
     * @param {string} extensionPath - Path passed to dynamic import()
     * @param {Object} config - Config passed to the extension constructor
     * @returns {Promise<boolean>} true if registration succeeded
     */
    async lazyLoad(grid, extensionPath, config = {}) {
        try {
            const mod = await import(extensionPath);
            const ExtClass = mod.default || Object.values(mod).find(v => typeof v === 'function');
            if (!ExtClass) {
                console.error(`ExtensionLoader.lazyLoad: no constructor found in "${extensionPath}"`);
                return false;
            }
            return this.loadExtension(grid, new ExtClass(config));
        } catch (err) {
            console.error(`ExtensionLoader.lazyLoad: failed to import "${extensionPath}":`, err);
            return false;
        }
    }
}

function _resolveGlobal(className) {
    if (typeof globalThis !== 'undefined' && globalThis[className]) return globalThis[className];
    if (typeof window   !== 'undefined' && window[className])   return window[className];
    if (typeof global   !== 'undefined' && global[className])   return global[className];
    return null;
}

// Export for use in both ES modules and browser globals
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExtensionLoader;
} else if (typeof window !== 'undefined') {
    window.ExtensionLoader = ExtensionLoader;
}