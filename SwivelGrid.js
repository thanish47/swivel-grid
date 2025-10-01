class SwivelGrid extends HTMLElement {
    static get observedAttributes() {
        return ['layout-type', 'schema', 'rows', 'search-input'];
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        
        // Internal state
        this._layoutType = 'grid';
        this._schema = [];
        this._rows = [];
        this._searchInput = null;
        
        // Property precedence tracking
        this._propSet = {
            schema: false,
            rows: false,
            layoutType: false,
            searchInput: false
        };
        
        // Property handlers
        this._sortHandler = null;
        this._searchHandler = null;
        
        // Internal bindings
        this._searchInputListener = null;
        
        // Extension system
        this._extensions = new Map();
        this._extensionHooks = {
            beforeRender: [],
            afterRender: []
        };
    }

    // Property getters/setters
    get schema() { return this._schema; }
    set schema(value) {
        this._propSet.schema = true;
        this._schema = Array.isArray(value) ? this._processSchema(value) : [];
        this.render();
    }

    get rows() { return this._rows; }
    set rows(value) {
        this._propSet.rows = true;
        this._rows = Array.isArray(value) ? value : [];
        this.render();
    }

    get layoutType() { return this._layoutType; }
    set layoutType(value) {
        this._propSet.layoutType = true;
        this._layoutType = (value === 'table' || value === 'list') ? 'table' : 'grid';
        this.render();
    }

    get searchInput() { return this._searchInput; }
    set searchInput(value) {
        this._propSet.searchInput = true;
        this._searchInput = value || null;
        
        // Delegate to SearchExtension
        const searchExtension = this.getExtension('search');
        if (searchExtension && searchExtension.enabled) {
            searchExtension.bindSearchInput(value);
        } else {
            console.warn('SwivelGrid: SearchExtension required for search input binding.');
        }
    }

    get sortHandler() { return this._sortHandler; }
    set sortHandler(value) { this._sortHandler = typeof value === 'function' ? value : null; }

    // Pagination properties are now handled by PaginationExtension
    // Getters/setters will be added by the extension when loaded

    get searchHandler() { return this._searchHandler; }
    set searchHandler(value) { this._searchHandler = typeof value === 'function' ? value : null; }

    // Extension Management
    registerExtension(extension) {
        if (!extension || !extension.name) {
            console.warn('SwivelGrid: Extension must have a name');
            return false;
        }
        
        if (this._extensions.has(extension.name)) {
            console.warn(`SwivelGrid: Extension "${extension.name}" already registered`);
            return false;
        }
        
        this._extensions.set(extension.name, extension);
        extension.initialize(this);
        
        // Add to hooks based on priority
        this._addToHook('beforeRender', extension);
        this._addToHook('afterRender', extension);
        
        return true;
    }
    
    unregisterExtension(extensionName) {
        const extension = this._extensions.get(extensionName);
        if (!extension) return false;
        
        extension.destroy();
        this._extensions.delete(extensionName);
        
        // Remove from hooks
        this._removeFromHook('beforeRender', extension);
        this._removeFromHook('afterRender', extension);
        
        return true;
    }
    
    getExtension(extensionName) {
        return this._extensions.get(extensionName) || null;
    }
    
    hasExtension(extensionName) {
        return this._extensions.has(extensionName);
    }
    
    listExtensions() {
        return Array.from(this._extensions.keys());
    }
    
    _addToHook(hookName, extension) {
        const hooks = this._extensionHooks[hookName];
        if (!hooks) return;
        
        // Insert in priority order (lower priority numbers first)
        let insertIndex = hooks.length;
        for (let i = 0; i < hooks.length; i++) {
            if (extension.priority < hooks[i].priority) {
                insertIndex = i;
                break;
            }
        }
        hooks.splice(insertIndex, 0, extension);
    }
    
    _removeFromHook(hookName, extension) {
        const hooks = this._extensionHooks[hookName];
        if (!hooks) return;
        
        const index = hooks.indexOf(extension);
        if (index >= 0) {
            hooks.splice(index, 1);
        }
    }

    /**
     * Add CSS to the shadow DOM (for extension styling)
     * @param {string} css - CSS string
     * @param {string} id - Unique ID for the style element
     * @returns {boolean} Success status
     */
    addExtensionStyles(css, id) {
        if (!this.shadowRoot || !css || !id) return false;
        
        // Remove existing style with same ID
        const existing = this.shadowRoot.querySelector(`style[data-extension-id="${id}"]`);
        if (existing) {
            existing.remove();
        }
        
        const style = document.createElement('style');
        style.setAttribute('data-extension-id', id);
        style.textContent = css;
        this.shadowRoot.appendChild(style);
        return true;
    }

    /**
     * Remove extension styles
     * @param {string} id - Extension style ID
     * @returns {boolean} Success status
     */
    removeExtensionStyles(id) {
        if (!this.shadowRoot || !id) return false;
        
        const style = this.shadowRoot.querySelector(`style[data-extension-id="${id}"]`);
        if (style) {
            style.remove();
            return true;
        }
        return false;
    }

    /**
     * Add event listener to grid with automatic cleanup
     * @param {string} eventName - Event name
     * @param {Function} handler - Event handler
     * @param {string} extensionName - Extension name for cleanup
     * @returns {Function} Cleanup function
     */
    addExtensionEventListener(eventName, handler, extensionName) {
        if (!this._extensionEventListeners) {
            this._extensionEventListeners = new Map();
        }
        
        if (!this._extensionEventListeners.has(extensionName)) {
            this._extensionEventListeners.set(extensionName, []);
        }
        
        const wrappedHandler = (event) => {
            try {
                handler(event);
            } catch (error) {
                console.error(`Extension ${extensionName} event handler error:`, error);
            }
        };
        
        this.addEventListener(eventName, wrappedHandler);
        this._extensionEventListeners.get(extensionName).push({
            eventName,
            handler: wrappedHandler
        });
        
        return () => this.removeEventListener(eventName, wrappedHandler);
    }

    /**
     * Clean up all event listeners for an extension
     * @param {string} extensionName - Extension name
     */
    cleanupExtensionEventListeners(extensionName) {
        if (!this._extensionEventListeners) return;
        
        const listeners = this._extensionEventListeners.get(extensionName);
        if (listeners) {
            listeners.forEach(({ eventName, handler }) => {
                this.removeEventListener(eventName, handler);
            });
            this._extensionEventListeners.delete(extensionName);
        }
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;

        // Property precedence: if property was set, ignore attribute changes
        if ((name === 'schema' && this._propSet.schema) ||
            (name === 'rows' && this._propSet.rows) ||
            (name === 'layout-type' && this._propSet.layoutType) ||
            (name === 'search-input' && this._propSet.searchInput)) {
            return;
        }

        switch (name) {
            case 'layout-type':
                this._layoutType = (newValue === 'table' || newValue === 'list') ? 'table' : 'grid';
                break;
            case 'schema':
                this._parseJsonAttribute('schema', newValue);
                break;
            case 'rows':
                this._parseJsonAttribute('rows', newValue);
                break;
            case 'search-input':
                this._searchInput = newValue;
                // Try to use SearchExtension first
                const searchExtension = this.getExtension('search');
                if (searchExtension && searchExtension.enabled) {
                    searchExtension.bindSearchInput(newValue);
                } else {
                    console.warn('SwivelGrid: SearchExtension required for search input binding.');
                }
                break;
        }
        this.render();
    }

    _parseJsonAttribute(property, jsonString) {
        try {
            let parsed = jsonString ? JSON.parse(jsonString) : [];
            if (property === 'schema') {
                parsed = this._processSchema(parsed);
            }
            this[`_${property}`] = parsed;
        } catch (error) {
            console.error(`Invalid JSON in ${property} attribute:`, error);
            this[`_${property}`] = [];
        }
    }

    connectedCallback() {
        // Initialize from attributes (only if properties weren't set)
        if (!this._propSet.layoutType) {
            const layoutAttr = this.getAttribute('layout-type');
            this._layoutType = (layoutAttr === 'table' || layoutAttr === 'list') ? 'table' : 'grid';
        }
        if (!this._propSet.schema) {
            this._parseJsonAttribute('schema', this.getAttribute('schema'));
        }
        if (!this._propSet.rows) {
            this._parseJsonAttribute('rows', this.getAttribute('rows'));
        }
        if (!this._propSet.searchInput) {
            this._searchInput = this.getAttribute('search-input');
        }
        
        this.render();
        
        // Search input binding is now handled by SearchExtension
        // Fallback for when SearchExtension is not loaded
        // Search input binding is now handled by SearchExtension
    }

    disconnectedCallback() {
        // Extensions handle their own cleanup
        
        // Cleanup extensions
        for (const extension of this._extensions.values()) {
            extension.destroy();
        }
        this._extensions.clear();
        this._extensionHooks.beforeRender = [];
        this._extensionHooks.afterRender = [];
    }


    // Scroll listeners are now handled by PaginationExtension

    // Scroll handling is now handled by PaginationExtension

    _dispatchEvent(type, detail) {
        this.dispatchEvent(new CustomEvent(`swivel:${type}`, {
            bubbles: true,
            composed: true,
            detail
        }));
    }

    // Public methods
    setData(rows) {
        this._rows = Array.isArray(rows) ? [...rows] : [];
        
        // Reset pagination state if extension is loaded
        const paginationExtension = this.getExtension('pagination');
        if (paginationExtension && paginationExtension.enabled) {
            paginationExtension.resetPaginationState();
        }
        
        this.render();
        this._dispatchEvent('data', { type: 'set', length: this._rows.length });
    }

    // setPageData and appendData are now handled by PaginationExtension
    // These methods will be added to the grid instance when the extension loads

    destroy() {
        // Extensions handle their own cleanup
        
        // Destroy all extensions
        this._extensions.forEach(extension => {
            if (extension.onDestroy) {
                extension.onDestroy();
            }
        });
    }

    render() {
        if (!this.shadowRoot) return;
        
        // Create rendering context for extensions
        let context = {
            schema: this._schema,
            rows: this._rows,
            layoutType: this._layoutType,
            searchInput: this._searchInput
        };
        
        // Execute beforeRender hooks
        for (const extension of this._extensionHooks.beforeRender) {
            if (extension.enabled) {
                const result = extension.beforeRender(context);
                if (result) {
                    context = result;
                }
            }
        }
        
        // Update internal state from context (in case extensions modified it)
        this._schema = context.schema || this._schema;
        this._rows = context.rows || this._rows;
        this._layoutType = context.layoutType || this._layoutType;
        
        // Note: Initial sorting is now handled by SortingExtension in beforeRender hook
        
        this.shadowRoot.innerHTML = `
            <style>
                ${this._getStyles()}
            </style>
            <div class="scroll-container">
                ${context.layoutHTML || this._renderLayout()}
                ${context.loadMoreHTML || ''}
            </div>
        `;
        
        // Sort listeners are now handled by SortingExtension in afterRender hook
        
        // Execute afterRender hooks
        const renderedElement = this.shadowRoot.querySelector('.scroll-container');
        for (const extension of this._extensionHooks.afterRender) {
            if (extension.enabled) {
                extension.afterRender(context, renderedElement);
            }
        }
    }

    _renderAppendedRows(newRows) {
        // Delegate to LayoutRendererExtension
        const layoutExtension = this.getExtension('layout-renderer');
        if (layoutExtension && layoutExtension.enabled) {
            layoutExtension.renderAppendedRows(newRows, this._layoutType, this._schema);
            return;
        }
        
        // No fallback - LayoutRendererExtension is required for appending rows
        console.warn('SwivelGrid: LayoutRendererExtension required for renderAppendedRows. Triggering full re-render instead.');
        this.render();
    }

    _getStyles() {
        return `
            :host {
                display: block;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                --primary-color: #007acc;
                --border-color: #e1e5e9;
                --hover-color: #f8f9fa;
                --text-color: #24292f;
            }

            .scroll-container {
                max-height: 600px;
                overflow: auto;
                border: 1px solid var(--border-color);
                border-radius: 6px;
            }

            /* Grid Layout Styles */
            .grid-container {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(${this._getMinCardWidth()}px, 1fr));
                gap: 16px;
                padding: 16px;
            }

            .grid-card {
                border: 1px solid var(--border-color);
                border-radius: 8px;
                padding: 16px;
                background: white;
                transition: box-shadow 0.2s ease;
            }

            .grid-card:hover {
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }

            .grid-card section[role="group"] {
                margin: 0;
            }


            .grid-field {
                margin-bottom: 8px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .grid-field:last-child {
                margin-bottom: 0;
            }

            .grid-field-label {
                font-weight: 600;
                color: var(--text-color);
                margin-right: 8px;
                min-width: 0;
            }

            .grid-field-value {
                color: #656d76;
                text-align: right;
                min-width: 0;
                word-break: break-word;
            }

            /* Table Layout Styles */
            .table-container {
                width: 100%;
                overflow-x: auto;
            }

            table {
                width: 100%;
                border-collapse: collapse;
                background: white;
            }

            th {
                background: #f6f8fa;
                border-bottom: 1px solid var(--border-color);
                padding: 12px 8px;
                text-align: left;
                font-weight: 600;
                color: var(--text-color);
                position: sticky;
                top: 0;
                cursor: pointer;
                user-select: none;
            }

            th:hover {
                background: #eaeef2;
            }

            th.sortable::after {
                content: '↕';
                margin-left: 4px;
                opacity: 0.5;
            }

            th.sort-asc::after {
                content: '↑';
                opacity: 1;
            }

            th.sort-desc::after {
                content: '↓';
                opacity: 1;
            }

            td {
                border-bottom: 1px solid #f1f3f4;
                padding: 12px 8px;
                vertical-align: middle;
            }

            tr:hover td {
                background: var(--hover-color);
            }



            /* Empty state */
            .empty-state {
                padding: 48px 24px;
                text-align: center;
                color: #656d76;
            }

            .empty-state h3 {
                margin: 0 0 8px 0;
                color: var(--text-color);
            }

            /* Screen reader only text */
            .sr-only {
                position: absolute;
                width: 1px;
                height: 1px;
                padding: 0;
                margin: -1px;
                overflow: hidden;
                clip: rect(0, 0, 0, 0);
                white-space: nowrap;
                border: 0;
            }



            /* Responsive */
            @media (max-width: 768px) {
                .grid-container {
                    grid-template-columns: 1fr;
                }
                
                .scroll-container {
                    max-height: 400px;
                }
            }
        `;
    }

    _getMinCardWidth() {
        if (!this._schema.length) return 240;
        const minWidths = this._schema
            .map(col => col.minWidth)
            .filter(Boolean)
            .map(width => /px$/.test(width) ? parseInt(width, 10) : NaN)
            .filter(Number.isFinite);
        return minWidths.length ? Math.max(...minWidths) : 240;
    }

    _renderLayout() {
        if (!this._schema.length || !this._rows.length) {
            return this._renderEmptyState();
        }

        // Use LayoutRendererExtension if available (preferred approach)
        const layoutExtension = this.getExtension('layout-renderer');
        if (layoutExtension && layoutExtension.enabled) {
            return this._layoutType === 'table' 
                ? layoutExtension.renderTable()
                : layoutExtension.renderGrid();
        }

        // Minimal fallback implementation
        return `<div class="extension-fallback">
            <p>LayoutRendererExtension required for rendering. Please load the extension.</p>
        </div>`;
    }

    _renderEmptyState() {
        return `
            <div class="empty-state">
                <h3>No data available</h3>
                <p>Add schema and rows to display content.</p>
            </div>
        `;
    }


    _renderCellContent(value, column, isGridImage = false, row = null) {
        // Handle null/empty rows from page gaps
        if (!row || typeof row !== 'object') {
            row = {};
        }
        
        // Use LayoutRendererExtension if available (preferred approach)
        const layoutExtension = this.getExtension('layout-renderer');
        if (layoutExtension && layoutExtension.enabled) {
            return layoutExtension.renderCellContent(value, column, isGridImage, row);
        }
        
        // Use custom cell template if provided
        if (column.cellTemplate) {
            // Try to use TemplateExtension first
            const templateExtension = this.getExtension('templates');
            if (templateExtension && templateExtension.enabled) {
                return templateExtension.renderTemplate(column.cellTemplate, {
                    value,
                    row,
                    column,
                    isGridImage
                });
            }
            
            // Fallback: render template without sanitization
            console.warn('SwivelGrid: TemplateExtension required for template rendering. Template will not be sanitized.');
            return column.cellTemplate.replace(/\{\{(\w+)\}\}/g, (match, key) => {
                const context = { value, row, column, isGridImage };
                return this._escapeHtml(String(context[key] || ''));
            });
        }
        
        
        // Handle null/undefined values
        if (value === null || value === undefined) {
            const placeholder = '—';
            if (column.cellClass) {
                // Try to use CssClassesExtension first
                const cssClassesExtension = this.getExtension('css-classes');
                if (cssClassesExtension && cssClassesExtension.enabled) {
                    return cssClassesExtension.applyCellClass(placeholder, column, value, row);
                }
                
                // Fallback implementation
                return `<span class="${this._sanitizeClassName(column.cellClass)}">${placeholder}</span>`;
            }
            return placeholder;
        }
        
        // Basic text rendering
        let content = this._escapeHtml(String(value));
        
        // Apply cellClass to content
        if (column.cellClass) {
            // Try to use CssClassesExtension first
            const cssClassesExtension = this.getExtension('css-classes');
            if (cssClassesExtension && cssClassesExtension.enabled) {
                return cssClassesExtension.applyCellClass(content, column, value, row);
            }
            
            // Fallback implementation
            return `<span class="${this._sanitizeClassName(column.cellClass)}">${content}</span>`;
        }
        
        return content;
    }



    _getColumnStyles(column) {
        const styles = [];
        if (column.minWidth) styles.push(`min-width: ${column.minWidth}`);
        if (column.maxWidth) styles.push(`max-width: ${column.maxWidth}`);
        return styles.join('; ');
    }


    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    _renderHeaderContent(column, isGridLabel = false) {
        // Optional: Use custom header template if provided
        if (column.headerTemplate) {
            // Try to use TemplateExtension first
            const templateExtension = this.getExtension('templates');
            if (templateExtension && templateExtension.enabled) {
                return templateExtension.renderTemplate(column.headerTemplate, {
                    column,
                    label: column.label,
                    isGridLabel
                });
            }
            
            // Fallback: render template without sanitization
            console.warn('SwivelGrid: TemplateExtension required for header template rendering. Template will not be sanitized.');
            return column.headerTemplate.replace(/\{\{(\w+)\}\}/g, (match, key) => {
                const context = { column, label: column.label, isGridLabel };
                return this._escapeHtml(String(context[key] || ''));
            });
        }

        // Default behavior with optional class application
        const label = this._escapeHtml(column.label);
        if (column.headerClass) {
            // Try to use CssClassesExtension first
            const cssClassesExtension = this.getExtension('css-classes');
            if (cssClassesExtension && cssClassesExtension.enabled) {
                return cssClassesExtension.applyHeaderClass(label, column);
            }
            
            // Fallback implementation
            return `<span class="${this._sanitizeClassName(column.headerClass)}">${label}</span>`;
        }
        
        return label;
    }


    _sanitizeClassName(s) {
        // Try to use CssClassesExtension first
        const cssClassesExtension = this.getExtension('css-classes');
        if (cssClassesExtension && cssClassesExtension.enabled) {
            return cssClassesExtension.sanitizeClassName(s);
        }
        
        // Fallback implementation
        return typeof s === 'string' ? s.split(/\s+/).map(t => t.replace(/[^\w-]/g, '')).join(' ') : '';
    }

    /**
     * Get header ARIA attributes (uses AccessibilityExtension if available)
     * @param {Object} column - Column configuration
     * @returns {string} ARIA attributes
     */
    _getHeaderARIA(column) {
        const accessibilityExtension = this.getExtension('accessibility');
        if (accessibilityExtension && accessibilityExtension.enabled) {
            return accessibilityExtension.generateHeaderARIA(column);
        }
        
        // Fallback implementation
        return [
            'role="columnheader"',
            'scope="col"',
            `tabindex="${column.sortable === false ? '-1' : '0'}"`,
            `aria-sort="${column.sort === 'ASC' ? 'ascending' : column.sort === 'DESC' ? 'descending' : 'none'}"`,
            `aria-disabled="${column.sortable === false ? 'true' : 'false'}"`
        ].join(' ');
    }

    /**
     * Get container ARIA attributes (uses AccessibilityExtension if available)
     * @param {string} layoutType - Layout type
     * @returns {Object} ARIA attributes
     */
    _getContainerARIA(layoutType) {
        const accessibilityExtension = this.getExtension('accessibility');
        if (accessibilityExtension && accessibilityExtension.enabled) {
            return accessibilityExtension.generateContainerARIA(layoutType);
        }
        
        // Fallback implementation
        if (layoutType === 'grid') {
            return {
                container: 'role="list"',
                item: 'role="listitem"',
                group: 'role="group"'
            };
        }
        
        return {
            container: 'role="table"',
            item: '',
            group: ''
        };
    }

    // Pagination UI and threshold methods are now handled by PaginationExtension

    _processSchema(schema) {
        if (!Array.isArray(schema)) return [];
        
        // Try to use TemplateExtension for template processing
        const templateExtension = this.getExtension('templates');
        if (templateExtension && templateExtension.enabled) {
            return templateExtension.processSchemaTemplates(schema);
        }
        
        // Fallback: return schema as-is when TemplateExtension is not available
        console.warn('SwivelGrid: TemplateExtension required for template processing. Templates will not be sanitized.');
        return [...schema];
    }
}

customElements.define('swivel-grid', SwivelGrid);