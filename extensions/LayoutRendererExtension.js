/**
 * LayoutRendererExtension for SwivelGrid
 * Handles table and grid layout rendering
 * Extracted from core SwivelGrid to support modular architecture
 */
class LayoutRendererExtension extends BaseExtension {
    constructor() {
        super('layout-renderer');
        this.priority = 10; // Core rendering should have high priority
    }

    onInitialize(gridInstance) {
        // Store reference to grid for accessing internal methods
        this.grid = gridInstance;
        this.addStickyHeaderStyles();
    }

    onDestroy() {
        this.removeStickyHeaderStyles();
    }

    onBeforeRender(context) {
        // Inject layout rendering into the context
        if (context.schema && context.rows) {
            context.layoutHTML = this.renderLayout(context);
        }
        return context;
    }

    /**
     * Main layout rendering dispatcher
     * @param {Object} context - Rendering context
     * @returns {string} HTML string for the layout
     */
    renderLayout(context) {
        const { schema, rows, layoutType } = context;
        
        if (!schema.length || !rows.length) {
            return this.renderEmptyState();
        }

        return layoutType === 'table' 
            ? this.renderTable(context)
            : this.renderGrid(context);
    }

    /**
     * Render empty state when no data is available
     * @returns {string} Empty state HTML
     */
    renderEmptyState() {
        return `
            <div class="empty-state">
                <h3>No data available</h3>
                <p>Add schema and rows to display content.</p>
            </div>
        `;
    }

    /**
     * Render table layout with sticky header by default
     * @param {Object} context - Rendering context
     * @returns {string} Table HTML with sticky header structure
     */
    renderTable(context) {
        const { schema, rows } = context;
        
        return `
            <div class="sticky-table-wrapper">
                ${this.renderStickyHeader(schema)}
                <div class="sticky-table-container">
                    ${this.renderTableBody(rows, schema)}
                </div>
            </div>
        `;
    }

    /**
     * Render sticky header for table
     * @param {Array} schema - Column schema
     * @returns {string} Header HTML
     */
    renderStickyHeader(schema) {
        return `
            <div class="sticky-table-header">
                <table class="swivel-table sticky-header">
                    <thead>
                        <tr>
                            ${schema.map(col => this.renderHeaderCell(col)).join('')}
                        </tr>
                    </thead>
                </table>
            </div>
        `;
    }

    /**
     * Render table body for sticky header structure
     * @param {Array} rows - Row data
     * @param {Array} schema - Column schema
     * @returns {string} Body HTML
     */
    renderTableBody(rows, schema) {
        return `
            <table class="swivel-table sticky-body">
                <tbody>
                    ${rows.map((row, index) => 
                        `<tr>${this.renderTableRow(row, schema, index)}</tr>`
                    ).join('')}
                </tbody>
            </table>
        `;
    }

    /**
     * Render header cell with proper attributes
     * @param {Object} col - Column configuration
     * @returns {string} Header cell HTML
     */
    renderHeaderCell(col) {
        return `
            <th class="${this.getSortClass(col)}" 
                data-key="${col.key}"
                style="${this.getColumnStyles(col)}"
                ${this.getHeaderARIA(col)}>
                ${this.renderHeaderContent(col)}
            </th>
        `;
    }

    /**
     * Render a single table row
     * @param {Object} row - Row data
     * @param {Array} schema - Column schema
     * @param {number} index - Row index (optional)
     * @returns {string} Table row HTML
     */
    renderTableRow(row, schema, index = 0) {
        return schema.map(col => `
            <td style="${this.getColumnStyles(col)}" ${col.className ? `class="${col.className}"` : ''}>
                ${this.renderCellContent(row[col.key], col, false, row)}
            </td>
        `).join('');
    }

    /**
     * Render grid layout
     * @param {Object} context - Rendering context
     * @returns {string} Grid HTML
     */
    renderGrid(context) {
        const { schema, rows } = context;
        
        const containerARIA = this.getContainerARIA('grid');
        return `
            <div class="grid-container" ${containerARIA.container}>
                ${rows.map(row => `
                    <div class="grid-card" ${containerARIA.item}>
                        ${this.renderGridCard(row, schema)}
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * Render a single grid card
     * @param {Object} row - Row data
     * @param {Array} schema - Column schema
     * @returns {string} Grid card HTML
     */
    renderGridCard(row, schema) {
        const imageCol = schema.find(col => col.type === 'image');
        const otherCols = schema.filter(col => col.type !== 'image');
        
        let content = '';
        
        if (imageCol) {
            content += this.renderCellContent(row[imageCol.key], imageCol, true);
        }

        if (otherCols.length) {
            const labelId = `label-${Math.random().toString(36).substr(2, 9)}`;
            
            const containerARIA = this.getContainerARIA('grid');
            content += `
                <section ${containerARIA.group} aria-labelledby="${labelId}">
                    ${otherCols.map((col, index) => `
                        <div class="grid-field">
                            <span class="grid-field-label" ${index === 0 ? `id="${labelId}"` : ''}>${this.renderHeaderContent(col, true)}:</span>
                            <span class="grid-field-value">${this.renderCellContent(row[col.key], col, false, row)}</span>
                        </div>
                    `).join('')}
                </section>
            `;
        }

        return content;
    }

    /**
     * Render cell content (uses ColumnTypesExtension if available)
     * @param {*} value - Cell value
     * @param {Object} column - Column configuration
     * @param {boolean} isGridImage - Whether this is a grid image
     * @param {Object} row - Row data
     * @returns {string} Cell content HTML
     */
    renderCellContent(value, column, isGridImage = false, row = null) {
        // Handle null/empty rows from page gaps
        if (!row || typeof row !== 'object') {
            row = {};
        }
        
        const grid = this.getGrid();
        
        // Check for custom cell template first (preferred approach)
        if (column.cellTemplate) {
            const templateExtension = grid?.getExtension('templates');
            if (templateExtension && templateExtension.enabled) {
                return templateExtension.renderCellTemplate(
                    column.cellTemplate,
                    value,
                    column,
                    row,
                    isGridImage
                );
            }
        }
        
        // Handle legacy column types with automatic template conversion
        if (column.type) {
            console.warn(`Column type "${column.type}" is deprecated. Please use cellTemplate with helpers instead. See COLUMN_TYPES_TO_TEMPLATES_MIGRATION.md for migration guide.`);
            
            const templateExtension = grid?.getExtension('templates');
            if (templateExtension && templateExtension.enabled) {
                switch (column.type) {
                    case 'rating':
                        return templateExtension.renderRating(value, { isGridImage });
                    case 'image':
                        return templateExtension.renderImage(value, { isGridImage });
                    default:
                        // Fall through to basic rendering
                        break;
                }
            }
        }
        
        // Fallback to grid's implementation
        if (this.grid && this.grid._renderCellContent) {
            return this.grid._renderCellContent(value, column, isGridImage, row);
        }
        
        // Handle null/undefined values
        if (value === null || value === undefined) {
            const placeholder = '—';
            return column.cellClass ? 
                `<span class="${this.sanitizeClassName(column.cellClass)}">${placeholder}</span>` : 
                placeholder;
        }
        
        // Basic fallback for text rendering with cellClass support
        let content = this.escapeHtml(String(value));
        if (column.cellClass) {
            content = `<span class="${this.sanitizeClassName(column.cellClass)}">${content}</span>`;
        }
        
        return content;
    }

    /**
     * Render header content (uses TemplateExtension if available)
     * @param {Object} column - Column configuration
     * @param {boolean} isGridLabel - Whether this is for grid layout
     * @returns {string} Header content HTML
     */
    renderHeaderContent(column, isGridLabel = false) {
        // Check for custom header template
        if (column.headerTemplate) {
            const grid = this.getGrid();
            const templateExtension = grid?.getExtension('templates');
            if (templateExtension && templateExtension.enabled) {
                return templateExtension.renderHeaderTemplate(
                    column.headerTemplate,
                    column,
                    column.label,
                    isGridLabel
                );
            }
        }
        
        // Fallback to grid's implementation
        if (this.grid && this.grid._renderHeaderContent) {
            return this.grid._renderHeaderContent(column, isGridLabel);
        }
        
        // Basic fallback for label rendering
        const label = this.escapeHtml(column.label || column.key);
        if (column.headerClass) {
            return `<span class="${this.sanitizeClassName(column.headerClass)}">${label}</span>`;
        }
        return label;
    }

    /**
     * Sanitize CSS class names (delegate to CssClassesExtension or grid fallback)
     * @param {string} className - Class name to sanitize
     * @returns {string} Sanitized class name
     */
    sanitizeClassName(className) {
        const grid = this.getGrid();
        
        // Try to use CssClassesExtension first
        const cssClassesExtension = grid?.getExtension('css-classes');
        if (cssClassesExtension && cssClassesExtension.enabled) {
            return cssClassesExtension.sanitizeClassName(className);
        }
        
        // Delegate to grid's method
        if (this.grid && this.grid._sanitizeClassName) {
            return this.grid._sanitizeClassName(className);
        }
        
        // Basic fallback
        return String(className || '').replace(/[^a-zA-Z0-9_-]/g, '');
    }

    /**
     * Get sort CSS classes for a column (uses SortingExtension if available)
     * @param {Object} column - Column configuration
     * @returns {string} CSS classes
     */
    getSortClass(column) {
        // Try to use SortingExtension first
        const grid = this.getGrid();
        const sortingExtension = grid?.getExtension('sorting');
        if (sortingExtension && sortingExtension.enabled) {
            return sortingExtension.getSortClass(column);
        }
        
        // Fallback implementation
        const classes = [];
        if (column.sortable !== false) classes.push('sortable');
        if (column.sort === 'ASC') classes.push('sort-asc');
        if (column.sort === 'DESC') classes.push('sort-desc');
        return classes.join(' ');
    }

    /**
     * Get column styles
     * @param {Object} column - Column configuration
     * @returns {string} CSS styles
     */
    getColumnStyles(column) {
        const styles = [];
        if (column.minWidth) styles.push(`min-width: ${column.minWidth}`);
        if (column.maxWidth) styles.push(`max-width: ${column.maxWidth}`);
        return styles.join('; ');
    }

    /**
     * Get header ARIA attributes (uses AccessibilityExtension if available)
     * @param {Object} column - Column configuration
     * @returns {string} ARIA attributes
     */
    getHeaderARIA(column) {
        const grid = this.getGrid();
        const accessibilityExtension = grid?.getExtension('accessibility');
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
    getContainerARIA(layoutType) {
        const grid = this.getGrid();
        const accessibilityExtension = grid?.getExtension('accessibility');
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

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Render appended rows for pagination
     * @param {Array} newRows - New rows to append
     * @param {string} layoutType - Current layout type
     * @param {Array} schema - Column schema
     */
    renderAppendedRows(newRows, layoutType, schema) {
        const grid = this.getGrid();
        const elements = grid.getDOMElements();
        
        if (layoutType === 'table' && elements.tbody) {
            const fragment = document.createDocumentFragment();
            newRows.forEach((row) => {
                const tr = document.createElement('tr');
                tr.innerHTML = this.renderTableRow(row, schema);
                fragment.appendChild(tr);
            });
            elements.tbody.appendChild(fragment);
        } else if (elements.gridContainer) {
            const fragment = document.createDocumentFragment();
            newRows.forEach((row) => {
                const card = document.createElement('div');
                card.className = 'grid-card';
                card.innerHTML = this.renderGridCard(row, schema);
                fragment.appendChild(card);
            });
            elements.gridContainer.appendChild(fragment);
        }
    }

    /**
     * Add CSS styles for sticky header tables
     */
    addStickyHeaderStyles() {
        const css = `
            /* Sticky Table Wrapper - Main container */
            .sticky-table-wrapper {
                height: 100%;
                display: flex;
                flex-direction: column;
                position: relative;
                overflow: hidden;
            }

            /* Sticky Header Container */
            .sticky-table-header {
                position: sticky;
                top: 0;
                z-index: 20;
                background: white;
                border-bottom: 2px solid #d1d9e0;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                flex-shrink: 0;
            }

            /* Scrollable Body Container */
            .sticky-table-container {
                flex: 1;
                overflow: auto;
                position: relative;
                will-change: scroll-position;
                -webkit-overflow-scrolling: touch;
                scroll-behavior: smooth;
            }

            /* Header Table Styling */
            .swivel-table.sticky-header {
                width: 100%;
                table-layout: fixed;
                margin: 0;
                border-collapse: collapse;
                background: white;
            }

            .swivel-table.sticky-header thead th {
                background: white;
                position: relative;
                border-bottom: 2px solid #d1d9e0;
                padding: 12px 8px;
                text-align: left;
                font-weight: 600;
                color: #24292f;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            /* Body Table Styling */
            .swivel-table.sticky-body {
                width: 100%;
                table-layout: fixed;
                margin: 0;
                border-collapse: collapse;
            }

            .swivel-table.sticky-body tbody td {
                padding: 8px;
                border-bottom: 1px solid #d0d7de;
                vertical-align: top;
                box-sizing: border-box;
            }

            .swivel-table.sticky-body tbody tr:hover {
                background-color: #f6f8fa;
            }

            /* Ensure column widths match between header and body */
            .sticky-table-header th,
            .sticky-table-container td {
                box-sizing: border-box;
                min-width: 0; /* Allow columns to shrink */
            }

            /* Improved scrollbar styling */
            .sticky-table-container {
                scrollbar-width: thin;
                scrollbar-color: #c1c1c1 #f1f1f1;
            }

            .sticky-table-container::-webkit-scrollbar {
                width: 12px;
                height: 12px;
            }

            .sticky-table-container::-webkit-scrollbar-track {
                background: #f1f1f1;
                border-radius: 6px;
            }

            .sticky-table-container::-webkit-scrollbar-thumb {
                background: #c1c1c1;
                border-radius: 6px;
                border: 2px solid #f1f1f1;
            }

            .sticky-table-container::-webkit-scrollbar-thumb:hover {
                background: #a8a8a8;
            }

            .sticky-table-container::-webkit-scrollbar-corner {
                background: #f1f1f1;
            }

            /* Responsive design for smaller screens */
            @media (max-width: 768px) {
                .sticky-table-header th {
                    padding: 8px 4px;
                    font-size: 14px;
                }
                
                .sticky-table-container td {
                    padding: 6px 4px;
                    font-size: 14px;
                }
            }

            /* Legacy table-container support for backward compatibility */
            .table-container {
                height: 100%;
                overflow: auto;
            }

            .table-container table {
                width: 100%;
                border-collapse: collapse;
            }

            .table-container table thead th {
                position: sticky;
                top: 0;
                background: white;
                border-bottom: 2px solid #d1d9e0;
                z-index: 10;
            }
        `;

        const grid = this.getGrid();
        if (grid && grid.addExtensionStyles) {
            grid.addExtensionStyles(css, 'layout-renderer-sticky');
        }
    }

    /**
     * Remove sticky header styles
     */
    removeStickyHeaderStyles() {
        const grid = this.getGrid();
        if (grid && grid.removeExtensionStyles) {
            grid.removeExtensionStyles('layout-renderer-sticky');
        }
    }
}

// Export for use in both ES modules and browser globals
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LayoutRendererExtension;
} else if (typeof window !== 'undefined') {
    window.LayoutRendererExtension = LayoutRendererExtension;
}