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
     * Create a minimal grid setup with core extensions
     * @param {SwivelGrid} grid - The grid instance
     * @returns {Array} Array of loaded core extension names
     */
    loadMinimalSetup(grid) {
        // This would load only the most essential extensions
        // For now, return empty array since we haven't created specific extensions yet
        return [];
    }

    /**
     * Create a standard grid setup with common extensions
     * @param {SwivelGrid} grid - The grid instance
     * @returns {Array} Array of loaded extension names
     */
    loadStandardSetup(grid) {
        // This would load the standard bundle
        // For now, return empty array since we haven't created the standard bundle yet
        return [];
    }

    /**
     * Create a full-featured grid setup with all extensions
     * @param {SwivelGrid} grid - The grid instance
     * @returns {Array} Array of loaded extension names
     */
    loadAdvancedSetup(grid) {
        // This would load the advanced bundle
        // For now, return empty array since we haven't created the advanced bundle yet
        return [];
    }
}

// Export for use in both ES modules and browser globals
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExtensionLoader;
} else if (typeof window !== 'undefined') {
    window.ExtensionLoader = ExtensionLoader;
}