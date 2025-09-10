/**
 * Base class for SwivelGrid extensions
 * Provides the foundation for all extensions with lifecycle hooks and utility methods
 */
class BaseExtension {
    constructor(name) {
        this.name = name;
        this.enabled = true;
        this.priority = 0; // Lower numbers execute first
        this._gridInstance = null;
    }

    /**
     * Called when extension is registered with a grid instance
     * @param {SwivelGrid} gridInstance - The grid instance this extension is attached to
     */
    initialize(gridInstance) {
        this._gridInstance = gridInstance;
        this.onInitialize?.(gridInstance);
    }

    /**
     * Called before the grid renders
     * @param {Object} context - Rendering context with schema, rows, layoutType, etc.
     * @returns {Object} Modified context (optional)
     */
    beforeRender(context) {
        if (!this.enabled) return context;
        return this.onBeforeRender?.(context) || context;
    }

    /**
     * Called after the grid renders
     * @param {Object} context - Rendering context
     * @param {HTMLElement} renderedElement - The rendered DOM element
     */
    afterRender(context, renderedElement) {
        if (!this.enabled) return;
        this.onAfterRender?.(context, renderedElement);
    }

    /**
     * Called when extension is being removed
     */
    destroy() {
        this.onDestroy?.();
        this._gridInstance = null;
    }

    /**
     * Enable or disable this extension
     * @param {boolean} enabled
     */
    setEnabled(enabled) {
        this.enabled = Boolean(enabled);
    }

    /**
     * Set the priority of this extension (affects execution order)
     * @param {number} priority - Lower numbers execute first
     */
    setPriority(priority) {
        this.priority = typeof priority === 'number' ? priority : 0;
    }

    /**
     * Get reference to the grid instance
     * @returns {SwivelGrid}
     */
    getGrid() {
        return this._gridInstance;
    }

    /**
     * Utility method to dispatch events from the grid
     * @param {string} eventName
     * @param {Object} detail
     */
    dispatchEvent(eventName, detail = {}) {
        if (this._gridInstance) {
            this._gridInstance._dispatchEvent(eventName, detail);
        }
    }

    /**
     * Utility method to get grid's current state
     * @returns {Object}
     */
    getGridState() {
        if (!this._gridInstance) return {};
        
        return {
            schema: this._gridInstance._schema,
            rows: this._gridInstance._rows,
            layoutType: this._gridInstance._layoutType,
            searchInput: this._gridInstance._searchInput,
            loading: this._gridInstance._loading,
            currentPage: this._gridInstance._currentPage,
            pageSize: this._gridInstance._pageSize,
            totalPages: this._gridInstance._totalPages
        };
    }

    // Override these methods in your extension
    onInitialize(gridInstance) {}
    onBeforeRender(context) {}
    onAfterRender(context, renderedElement) {}
    onDestroy() {}
}

// Export for use in both ES modules and browser globals
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BaseExtension;
} else if (typeof window !== 'undefined') {
    window.BaseExtension = BaseExtension;
}