/**
 * SortingExtension for SwivelGrid
 * Handles column sorting functionality, sort indicators, and event listeners
 * Extracted from core SwivelGrid to support modular architecture
 */
class SortingExtension extends BaseExtension {
    constructor() {
        super('sorting');
        this.priority = 30; // Should load after layout and column types
    }

    onInitialize(gridInstance) {
        this.grid = gridInstance;
        this.addSortingStyles();
    }

    onAfterRender(context, renderedElement) {
        // Attach sort listeners after each render
        this.attachSortListeners();
    }

    onDestroy() {
        this.removeSortingStyles();
    }

    /**
     * Get sort CSS classes for a column
     * @param {Object} column - Column configuration
     * @returns {string} CSS classes for sorting
     */
    getSortClass(column) {
        const classes = [];
        if (column.sortable !== false) classes.push('sortable');
        if (column.sort === 'ASC') classes.push('sort-asc');
        if (column.sort === 'DESC') classes.push('sort-desc');
        return classes.join(' ');
    }

    /**
     * Attach sort event listeners to table headers
     */
    attachSortListeners() {
        const grid = this.getGrid();
        const shadowRoot = grid?.shadowRoot;
        if (!shadowRoot) return;

        const headers = shadowRoot.querySelectorAll('th[data-key]');
        headers.forEach(header => {
            const key = header.dataset.key;
            const gridState = grid.getGridState();
            const col = gridState.schema.find(c => c.key === key);
            if (col?.sortable === false) return;
            
            // Remove existing listeners to prevent duplicates
            header.removeEventListener('click', this._clickHandler);
            header.removeEventListener('keydown', this._keydownHandler);
            
            // Store bound handlers for cleanup
            this._clickHandler = (e) => {
                this.handleSort(e.currentTarget.dataset.key);
            };
            
            this._keydownHandler = (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.handleSort(e.currentTarget.dataset.key);
                }
            };
            
            header.addEventListener('click', this._clickHandler);
            header.addEventListener('keydown', this._keydownHandler);
        });
    }

    /**
     * Handle sort column click/keyboard activation
     * @param {string} key - Column key to sort by
     */
    handleSort(key) {
        const grid = this.getGrid();
        const gridState = grid.getGridState();
        const column = gridState.schema.find(col => col.key === key);
        if (!column) return;

        // Toggle sort direction
        const currentSort = column.sort;
        const newDirection = currentSort === 'ASC' ? 'DESC' : 'ASC';
        
        // Clear all other sorts and set new sort on the actual schema
        grid._schema.forEach(col => {
            col.sort = col.key === key ? newDirection : undefined;
        });

        // Check if pagination is active (server-side data)
        const isPaginationActive = gridState.totalPages !== null;
        
        if (isPaginationActive) {
            // For server-side pagination, do NOT perform local sorting
            console.warn('SwivelGrid: Client-side sorting disabled when pagination is active. Sorting should be handled server-side via sortHandler.');
        } else {
            // Reset paging when sorting (only for client-side data)
            if (grid._currentPage !== undefined) grid._currentPage = 1;
            if (grid._lastTriggeredPage !== undefined) grid._lastTriggeredPage = 0;
            if (grid._endReached !== undefined) grid._endReached = false;
            
            // Sort the data (client-side only)
            this.sortData(key, newDirection, column.sortComparator);
        }

        // Trigger handlers and events
        if (grid._sortHandler) {
            grid._sortHandler({ key, direction: newDirection });
        }
        grid.dispatchExtensionEvent('sort', { key, direction: newDirection });

        // Re-render to show new sort indicators
        grid.render();
    }

    /**
     * Sort the grid data by a column
     * @param {string} key - Column key to sort by
     * @param {string} direction - Sort direction ('ASC' or 'DESC')
     * @param {Function} customComparator - Optional custom sort function
     */
    sortData(key, direction, customComparator) {
        const grid = this.getGrid();
        if (!grid._rows) return;

        grid._rows.sort((a, b) => {
            const aVal = a[key];
            const bVal = b[key];

            let result;
            if (customComparator) {
                result = customComparator(aVal, bVal, a, b);
            } else {
                result = this.defaultSort(aVal, bVal, key);
            }

            return direction === 'DESC' ? -result : result;
        });
    }

    /**
     * Default sort comparison function
     * @param {*} a - First value
     * @param {*} b - Second value
     * @param {string} key - Column key being sorted
     * @returns {number} Sort comparison result
     */
    defaultSort(a, b, key) {
        const grid = this.getGrid();
        const gridState = grid.getGridState();
        const column = gridState.schema.find(col => col.key === key);
        const type = column?.type || 'text';

        // Use TemplateExtension for enhanced sorting capabilities
        const templateExtension = grid?.getExtension('templates');
        if (templateExtension && templateExtension.enabled) {
            // Check if column uses templates that need special sorting
            if (column?.cellTemplate) {
                // Detect template type and sort accordingly
                if (column.cellTemplate.includes('renderRating')) {
                    const aRating = templateExtension.parseRating(a);
                    const bRating = templateExtension.parseRating(b);
                    const aRatio = aRating.isValid ? aRating.value / aRating.max : 0;
                    const bRatio = bRating.isValid ? bRating.value / bRating.max : 0;
                    return aRatio - bRatio;
                } else if (column.cellTemplate.includes('renderImage')) {
                    const aImg = templateExtension.parseImage(a);
                    const bImg = templateExtension.parseImage(b);
                    return aImg.alt.localeCompare(bImg.alt);
                } else if (column.cellTemplate.includes('formatDate')) {
                    // Handle date sorting
                    const aDate = templateExtension.parseDate ? templateExtension.parseDate(a) : new Date(a);
                    const bDate = templateExtension.parseDate ? templateExtension.parseDate(b) : new Date(b);
                    return aDate - bDate;
                } else if (column.cellTemplate.includes('formatNumber') || column.cellTemplate.includes('formatCurrency')) {
                    // Handle numeric sorting
                    const aNum = parseFloat(a) || 0;
                    const bNum = parseFloat(b) || 0;
                    return aNum - bNum;
                }
            }
        }


        // Default text/numeric comparison
        if (typeof a === 'number' && typeof b === 'number') {
            return a - b;
        }

        return String(a || '').localeCompare(String(b || ''));
    }

    /**
     * Get the currently active sort configuration
     * @returns {Object|null} Active sort config or null
     */
    getActiveSort() {
        const grid = this.getGrid();
        const gridState = grid.getGridState();
        return gridState.schema.find(col => col.sort) || null;
    }

    /**
     * Set sort on a column programmatically
     * @param {string} key - Column key
     * @param {string} direction - Sort direction ('ASC' or 'DESC')
     * @param {boolean} render - Whether to re-render after sorting
     */
    setSortColumn(key, direction, render = true) {
        const grid = this.getGrid();
        const gridState = grid.getGridState();
        const column = gridState.schema.find(col => col.key === key);
        if (!column) return false;

        // Clear all sorts and set new one
        grid._schema.forEach(col => {
            col.sort = col.key === key ? direction : undefined;
        });

        // Only sort data if not using server-side pagination
        const isPaginationActive = gridState.totalPages !== null;
        if (!isPaginationActive) {
            this.sortData(key, direction, column.sortComparator);
        }

        if (render) {
            grid.render();
        }

        return true;
    }

    /**
     * Clear all column sorts
     * @param {boolean} render - Whether to re-render after clearing
     */
    clearSort(render = true) {
        const grid = this.getGrid();
        
        grid._schema.forEach(col => {
            col.sort = undefined;
        });

        if (render) {
            grid.render();
        }
    }

    /**
     * Check if sorting is available for the current grid state
     * @returns {boolean} Whether sorting is available
     */
    isSortingAvailable() {
        const grid = this.getGrid();
        const gridState = grid.getGridState();
        
        // Check if any columns are sortable
        return gridState.schema.some(col => col.sortable !== false);
    }

    /**
     * Add CSS styles for sorting indicators
     */
    addSortingStyles() {
        const css = `
            /* Sorting indicators */
            th.sortable {
                cursor: pointer;
                user-select: none;
            }

            th.sortable:hover {
                background-color: rgba(0, 0, 0, 0.05);
            }

            th.sortable::after {
                content: '↕';
                margin-left: 4px;
                opacity: 0.5;
                font-size: 12px;
            }

            th.sort-asc::after {
                content: '↑';
                opacity: 1;
                color: var(--sort-indicator-color, #0969da);
            }

            th.sort-desc::after {
                content: '↓';
                opacity: 1;
                color: var(--sort-indicator-color, #0969da);
            }

            th.sortable:focus {
                outline: 2px solid var(--focus-color, #0969da);
                outline-offset: -2px;
            }

            /* Accessibility improvements */
            th[aria-disabled="true"] {
                cursor: not-allowed;
                opacity: 0.6;
            }

            th[aria-disabled="true"]:hover {
                background-color: transparent;
            }
        `;

        const grid = this.getGrid();
        if (grid && grid.addExtensionStyles) {
            grid.addExtensionStyles(css, 'sorting');
        }
    }

    /**
     * Remove sorting styles from the grid
     */
    removeSortingStyles() {
        const grid = this.getGrid();
        if (grid && grid.removeExtensionStyles) {
            grid.removeExtensionStyles('sorting');
        }
    }

    /**
     * Handle initial sort application during render
     * @param {Object} context - Render context
     * @returns {Object} Modified context
     */
    onBeforeRender(context) {
        // Apply initial sorting if specified in schema
        const initialSort = context.schema.find(col => col.sort === 'ASC' || col.sort === 'DESC');
        if (initialSort && context.rows.length > 0) {
            // Clear other sort flags to ensure only one column is sorted
            context.schema.forEach(col => { 
                if (col !== initialSort) col.sort = undefined; 
            });
            
            // Only perform initial sort when pagination is not active
            const isPaginationActive = context.totalPages !== null;
            if (!isPaginationActive) {
                // Sort the actual data
                const grid = this.getGrid();
                if (grid._rows) {
                    this.sortData(initialSort.key, initialSort.sort, initialSort.sortComparator);
                    // Update context with sorted data
                    context.rows = [...grid._rows];
                }
            } else {
                console.warn('SwivelGrid: Initial client-side sorting disabled when pagination is active. Server should provide pre-sorted data.');
            }
        }
        
        return context;
    }
}

// Export for use in both ES modules and browser globals
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SortingExtension;
} else if (typeof window !== 'undefined') {
    window.SortingExtension = SortingExtension;
}