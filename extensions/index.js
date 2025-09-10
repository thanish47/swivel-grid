/**
 * SwivelGrid Extensions - Main Export File
 * This file provides convenient imports for all extension-related functionality
 */

// Core extension system
export { default as BaseExtension } from './BaseExtension.js';
export { default as ExtensionLoader } from './ExtensionLoader.js';

// Extension utilities
export const ExtensionUtils = {
    /**
     * Create a new extension class that extends BaseExtension
     * @param {string} name - Extension name
     * @param {Object} methods - Methods to add to the extension
     * @returns {class} Extension class
     */
    createExtension(name, methods = {}) {
        return class extends BaseExtension {
            constructor(config = {}) {
                super(name);
                Object.assign(this, config);
                
                // Add custom methods
                Object.entries(methods).forEach(([key, value]) => {
                    if (typeof value === 'function') {
                        this[key] = value.bind(this);
                    } else {
                        this[key] = value;
                    }
                });
            }
        };
    },

    /**
     * Helper to create a simple hook-based extension
     * @param {string} name - Extension name
     * @param {Object} hooks - Hook functions
     * @returns {BaseExtension} Extension instance
     */
    createHookExtension(name, hooks = {}) {
        const extension = new BaseExtension(name);
        
        if (hooks.onInitialize) extension.onInitialize = hooks.onInitialize;
        if (hooks.onBeforeRender) extension.onBeforeRender = hooks.onBeforeRender;
        if (hooks.onAfterRender) extension.onAfterRender = hooks.onAfterRender;
        if (hooks.onDestroy) extension.onDestroy = hooks.onDestroy;
        
        return extension;
    },

    /**
     * Helper to wrap a function as a simple extension
     * @param {string} name - Extension name
     * @param {Function} renderFn - Function to call during beforeRender
     * @param {number} priority - Extension priority
     * @returns {BaseExtension} Extension instance
     */
    wrapFunction(name, renderFn, priority = 0) {
        const extension = new BaseExtension(name);
        extension.setPriority(priority);
        
        extension.onBeforeRender = (context) => {
            return renderFn(context) || context;
        };
        
        return extension;
    }
};

// Browser global exports (for non-module usage)
if (typeof window !== 'undefined') {
    window.SwivelGridExtensions = {
        BaseExtension: window.BaseExtension,
        ExtensionLoader: window.ExtensionLoader,
        ExtensionUtils
    };
}