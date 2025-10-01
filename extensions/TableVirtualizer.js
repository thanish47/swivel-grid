/**
 * TableVirtualizer for SwivelGrid
 * Provides virtualization for table layout to handle large datasets efficiently.
 * Only renders visible rows in the viewport to maintain smooth performance.
 */
class TableVirtualizer extends BaseExtension {
    constructor() {
        super('table-virtualizer');
        this.priority = 15; // Load after layout renderer but before other features
        
        // Virtualization settings
        this.rowHeight = 40; // Fixed row height in pixels
        this.overscan = 5; // Number of extra rows to render outside viewport
        this.scrollContainer = null;
        this.viewport = null;
        this.spacerTop = null;
        this.spacerBottom = null;
        
        // State management
        this.totalRows = 0;
        this.visibleRange = { start: 0, end: 0 };
        this.lastScrollTop = 0;
        this.isScrolling = false;
        this.scrollTimeout = null;
        
        // Performance tracking
        this.renderCount = 0;
        this.lastRenderTime = 0;
        
        // Event handlers
        this._onScroll = this._handleScroll.bind(this);
        this._onResize = this._handleResize.bind(this);
    }

    onInitialize(gridInstance) {
        this.grid = gridInstance;
        this.addVirtualizationStyles();
        
        // Override layout renderer if available
        this._overrideLayoutRenderer();
    }

    onDestroy() {
        this.removeScrollListeners();
        this.removeVirtualizationStyles();
        this._restoreLayoutRenderer();
    }

    onAfterRender(context, renderedElement) {
        // Only virtualize table layout
        if (context.layoutType !== 'table') {
            return context;
        }

        this.setupVirtualization();
        return context;
    }

    /**
     * Override layout renderer to inject virtualization
     */
    _overrideLayoutRenderer() {
        const layoutExt = this.grid.getExtension('layout-renderer');
        if (layoutExt && layoutExt.enabled) {
            // Store original render methods
            this._originalRenderTable = layoutExt.renderTable;
            this._originalRenderTableBody = layoutExt.renderTableBody;
            
            // Override with virtualized version
            layoutExt.renderTable = (context) => {
                const rows = Array.isArray(context) ? context : context.rows || [];
                const schema = Array.isArray(context) ? arguments[1] : context.schema || [];
                
                if (this.isVirtualizationEnabled(rows.length)) {
                    return this.renderVirtualizedTable(rows, schema, context.options || {});
                } else {
                    // Use original implementation for small datasets
                    return this._originalRenderTable.call(layoutExt, context);
                }
            };
            
            // Override renderTableBody for virtualization integration
            if (layoutExt.renderTableBody) {
                layoutExt.renderTableBody = (rows, schema) => {
                    if (this.isVirtualizationEnabled(rows.length)) {
                        // For virtualization, we'll handle body rendering in our virtualized method
                        return this.renderVirtualizedTableBody(rows, schema);
                    } else {
                        return this._originalRenderTableBody.call(layoutExt, rows, schema);
                    }
                };
            }
        }
    }

    /**
     * Restore original layout renderer
     */
    _restoreLayoutRenderer() {
        const layoutExt = this.grid.getExtension('layout-renderer');
        if (layoutExt && this._originalRenderTable) {
            layoutExt.renderTable = this._originalRenderTable;
        }
    }

    /**
     * Check if virtualization should be enabled
     * @param {number} rowCount - Number of rows
     * @returns {boolean} Whether to enable virtualization
     */
    isVirtualizationEnabled(rowCount) {
        // Enable virtualization for datasets larger than 25 rows
        // After optimizations, virtualization overhead is minimal and provides benefits earlier
        return rowCount > 25;
    }

    /**
     * Render virtualized table
     * @param {Array} rows - All row data
     * @param {Array} schema - Column schema
     * @param {Object} options - Render options
     * @returns {string} Virtualized table HTML
     */
    renderVirtualizedTable(rows, schema, options = {}) {
        const startTime = performance.now();
        this.totalRows = rows.length;
        
        // For very large datasets, use ultra-conservative initial render
        const isExtremelyLarge = rows.length > 100000;
        const isVeryLarge = rows.length > 50000;
        
        if (isExtremelyLarge) {
            // Ultra-conservative settings for 100K+ rows
            this.overscan = 2;
            this.rowHeight = Math.max(30, this.rowHeight); // Ensure reasonable row height
        } else if (isVeryLarge) {
            // Conservative settings for 50K+ rows
            this.overscan = Math.min(3, this.overscan);
        }
        
        // Calculate initial visible range with minimal rows
        // Try to detect actual container height, fallback to estimate
        let containerHeight = 400;
        const gridElement = this.getGrid();
        if (gridElement && gridElement.parentElement) {
            const parentHeight = gridElement.parentElement.clientHeight;
            if (parentHeight > 0) {
                containerHeight = Math.min(parentHeight, 600); // Cap at 600px for performance
            }
        }
        
        const initialVisibleCount = Math.ceil(containerHeight / this.rowHeight);
        
        // For extremely large datasets, start with only what's visible + minimal buffer
        let maxInitialRender;
        if (isExtremelyLarge) {
            maxInitialRender = Math.min(15, initialVisibleCount + 5);
        } else if (isVeryLarge) {
            maxInitialRender = Math.min(25, initialVisibleCount + 10);
        } else {
            maxInitialRender = initialVisibleCount + this.overscan * 2;
        }
        
        // Set minimal initial range
        const adjustedRange = { 
            start: 0, 
            end: Math.min(maxInitialRender, this.totalRows)
        };
        
        this.visibleRange = adjustedRange;
        const visibleRows = rows.slice(adjustedRange.start, adjustedRange.end);
        
        // Render table structure with fixed header and scrollable body (using new default structure)
        const tableHTML = `
            <div class="sticky-table-wrapper virtualized" data-total-rows="${this.totalRows}">
                ${this.renderStickyVirtualizedHeader(schema)}
                <div class="sticky-table-container virtualized">
                    <div class="virtual-spacer-top" style="height: 0px;"></div>
                    <div class="virtual-viewport">
                        ${this.renderVirtualizedTableBody(visibleRows, schema, 0)}
                    </div>
                    <div class="virtual-spacer-bottom" style="height: ${(this.totalRows - adjustedRange.end) * this.rowHeight}px;"></div>
                </div>
            </div>
        `;

        this.renderCount++;
        this.lastRenderTime = performance.now() - startTime;
        
        // Performance logging with threshold
        if (isExtremelyLarge || this.lastRenderTime > 100) {
            console.log(`TableVirtualizer: Rendered ${this.totalRows.toLocaleString()} rows (${adjustedRange.end} visible) in ${this.lastRenderTime.toFixed(2)}ms`);
        }

        return tableHTML;
    }

    /**
     * Render sticky header that stays at the top (compatible with default sticky structure)
     * @param {Array} schema - Column schema
     * @returns {string} Header HTML
     */
    renderStickyVirtualizedHeader(schema) {
        const layoutExt = this.grid.getExtension('layout-renderer');
        if (!layoutExt) {
            return '<div>LayoutRendererExtension required for virtualization</div>';
        }

        return `
            <div class="sticky-table-header virtualized">
                <table class="swivel-table sticky-header virtualized">
                    <thead>
                        <tr>
                            ${schema.map(col => layoutExt.renderHeaderCell(col)).join('')}
                        </tr>
                    </thead>
                </table>
            </div>
        `;
    }

    /**
     * Render virtualized table body with visible rows only
     * @param {Array} visibleRows - Visible row data
     * @param {Array} schema - Column schema
     * @param {number} startIndex - Starting row index
     * @returns {string} Body HTML
     */
    renderVirtualizedTableBody(visibleRows, schema, startIndex) {
        const layoutExt = this.grid.getExtension('layout-renderer');
        if (!layoutExt) {
            return '<div>LayoutRendererExtension required for virtualization</div>';
        }

        return `
            <table class="swivel-table sticky-body virtualized">
                <tbody>
                    ${visibleRows.map((row, index) => 
                        `<tr>${layoutExt.renderTableRow(row, schema, startIndex + index)}</tr>`
                    ).join('')}
                </tbody>
            </table>
        `;
    }

    /**
     * Set up virtualization after render
     */
    setupVirtualization() {
        const grid = this.getGrid();
        const shadowRoot = grid.shadowRoot;
        if (!shadowRoot) return;

        // Find scroll container - should be the container with the scrollable body
        this.scrollContainer = shadowRoot.querySelector('.sticky-table-container.virtualized') || 
                              shadowRoot.querySelector('.virtualized-table-container') ||
                              shadowRoot.querySelector('.sticky-table-container') || 
                              shadowRoot.querySelector('.scroll-container');
        
        if (!this.scrollContainer) return;

        // Get virtualization elements
        this.viewport = shadowRoot.querySelector('.virtual-viewport');
        this.spacerTop = shadowRoot.querySelector('.virtual-spacer-top');
        this.spacerBottom = shadowRoot.querySelector('.virtual-spacer-bottom');

        // Set up scroll listeners
        this.removeScrollListeners();
        this.scrollContainer.addEventListener('scroll', this._onScroll, { passive: true });
        window.addEventListener('resize', this._onResize, { passive: true });

        // Synchronize column widths between header and body
        this.synchronizeColumnWidths();
    }

    /**
     * Handle scroll events with virtualization
     */
    _handleScroll() {
        if (this.isScrolling) return;
        
        this.isScrolling = true;
        
        // Clear previous timeout
        if (this.scrollTimeout) {
            clearTimeout(this.scrollTimeout);
        }

        // Use RAF for smooth scrolling with debouncing for large datasets
        requestAnimationFrame(() => {
            const scrollTop = this.scrollContainer.scrollTop;
            
            // More aggressive threshold for extremely large datasets
            const threshold = this.totalRows > 100000 ? this.rowHeight : this.rowHeight / 2;
            
            // Only update if scroll position changed significantly
            if (Math.abs(scrollTop - this.lastScrollTop) > threshold) {
                this.updateVisibleRange(scrollTop);
                this.lastScrollTop = scrollTop;
            }

            // Longer timeout for large datasets to reduce update frequency
            const timeoutMs = this.totalRows > 100000 ? 150 : 100;
            this.scrollTimeout = setTimeout(() => {
                this.isScrolling = false;
            }, timeoutMs);
        });
    }

    /**
     * Handle window resize
     */
    _handleResize() {
        // Recalculate visible range on resize
        if (this.scrollContainer) {
            requestAnimationFrame(() => {
                this.updateVisibleRange(this.scrollContainer.scrollTop);
                this.synchronizeColumnWidths(); // Re-sync column widths on resize
            });
        }
    }

    /**
     * Synchronize column widths between header and body tables
     */
    synchronizeColumnWidths() {
        const grid = this.getGrid();
        const shadowRoot = grid?.shadowRoot;
        if (!shadowRoot) return;

        // Try new structure first, then fall back to old structure
        const headerTable = shadowRoot.querySelector('.sticky-table-header.virtualized table') ||
                           shadowRoot.querySelector('.virtualized-table-header table') ||
                           shadowRoot.querySelector('.sticky-table-header table');
        
        const bodyTable = shadowRoot.querySelector('.sticky-table-container.virtualized table') ||
                         shadowRoot.querySelector('.virtualized-table-container table') ||
                         shadowRoot.querySelector('.sticky-table-container table');
        
        if (!headerTable || !bodyTable) return;

        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
            const headerCells = headerTable.querySelectorAll('thead th');
            const bodyRows = bodyTable.querySelectorAll('tbody tr');
            
            if (bodyRows.length > 0) {
                const firstBodyRow = bodyRows[0];
                const bodyCells = firstBodyRow.querySelectorAll('td');
                
                // Sync widths from body cells to header cells (body is more accurate for content)
                for (let i = 0; i < Math.min(headerCells.length, bodyCells.length); i++) {
                    const bodyCell = bodyCells[i];
                    const headerCell = headerCells[i];
                    
                    if (bodyCell && headerCell) {
                        const computedWidth = window.getComputedStyle(bodyCell).width;
                        headerCell.style.width = computedWidth;
                        headerCell.style.minWidth = computedWidth;
                        headerCell.style.maxWidth = computedWidth;
                    }
                }
            }
        });
    }

    /**
     * Calculate visible range based on scroll position
     * @param {number} scrollTop - Current scroll position
     * @returns {Object} Visible range {start, end}
     */
    calculateVisibleRange(scrollTop) {
        const containerHeight = this.scrollContainer ? 
            this.scrollContainer.clientHeight : 400; // fallback height

        const startIndex = Math.floor(scrollTop / this.rowHeight);
        const visibleCount = Math.ceil(containerHeight / this.rowHeight);
        
        // Add overscan for smooth scrolling
        const start = Math.max(0, startIndex - this.overscan);
        const end = Math.min(this.totalRows, startIndex + visibleCount + this.overscan);

        return { start, end };
    }

    /**
     * Update visible range and re-render if needed
     * @param {number} scrollTop - Current scroll position
     */
    updateVisibleRange(scrollTop) {
        const newRange = this.calculateVisibleRange(scrollTop);
        
        // Only update if range changed significantly
        if (newRange.start !== this.visibleRange.start || 
            newRange.end !== this.visibleRange.end) {
            
            const oldRange = this.visibleRange;
            this.visibleRange = newRange;
            
            // Update DOM efficiently
            this.updateVirtualDOM(oldRange, newRange);
        }
    }

    /**
     * Update virtual DOM elements efficiently
     * @param {Object} oldRange - Previous visible range
     * @param {Object} newRange - New visible range
     */
    updateVirtualDOM(oldRange, newRange) {
        if (!this.viewport || !this.spacerTop || !this.spacerBottom) return;

        // Performance optimization: batch DOM updates for large datasets
        const isLargeUpdate = this.totalRows > 50000;
        
        if (isLargeUpdate) {
            // Use documentFragment for better performance with large datasets
            this.updateVirtualDOMBatched(oldRange, newRange);
        } else {
            this.updateVirtualDOMStandard(oldRange, newRange);
        }
    }

    /**
     * Standard DOM update for smaller datasets
     * @param {Object} oldRange - Previous visible range
     * @param {Object} newRange - New visible range
     */
    updateVirtualDOMStandard(oldRange, newRange) {
        const gridState = this.getGridState();
        const visibleRows = gridState.rows.slice(newRange.start, newRange.end);
        
        // Update spacers
        this.spacerTop.style.height = `${newRange.start * this.rowHeight}px`;
        this.spacerBottom.style.height = `${(this.totalRows - newRange.end) * this.rowHeight}px`;

        // Update viewport content - only the tbody part
        const layoutExt = this.grid.getExtension('layout-renderer');
        if (layoutExt) {
            const tbody = this.viewport.querySelector('tbody');
            if (tbody) {
                tbody.innerHTML = visibleRows.map((row, index) => 
                    layoutExt.renderTableRow(row, gridState.schema, newRange.start + index)
                ).join('');
                
                // Re-synchronize column widths after content change
                setTimeout(() => this.synchronizeColumnWidths(), 0);
            }
        }

        // Dispatch virtualization update event
        this.grid.dispatchExtensionEvent('virtualization-update', {
            oldRange,
            newRange,
            visibleRowCount: visibleRows.length,
            totalRows: this.totalRows
        });
    }

    /**
     * Batched DOM update for large datasets using documentFragment
     * @param {Object} oldRange - Previous visible range  
     * @param {Object} newRange - New visible range
     */
    updateVirtualDOMBatched(oldRange, newRange) {
        const startTime = performance.now();
        const gridState = this.getGridState();
        const visibleRows = gridState.rows.slice(newRange.start, newRange.end);
        
        // Batch DOM updates to minimize reflow/repaint
        requestAnimationFrame(() => {
            // Update spacers first
            this.spacerTop.style.height = `${newRange.start * this.rowHeight}px`;
            this.spacerBottom.style.height = `${(this.totalRows - newRange.end) * this.rowHeight}px`;

            // Update tbody content with fragment for better performance
            const layoutExt = this.grid.getExtension('layout-renderer');
            const tbody = this.viewport.querySelector('tbody');
            
            if (layoutExt && tbody) {
                // Create document fragment to minimize DOM manipulation
                const fragment = document.createDocumentFragment();
                const tempDiv = document.createElement('div');
                
                // Build HTML in memory first
                tempDiv.innerHTML = visibleRows.map((row, index) => 
                    layoutExt.renderTableRow(row, gridState.schema, newRange.start + index)
                ).join('');
                
                // Move elements to fragment
                while (tempDiv.firstChild) {
                    fragment.appendChild(tempDiv.firstChild);
                }
                
                // Single DOM update
                tbody.innerHTML = '';
                tbody.appendChild(fragment);
                
                // Re-synchronize column widths after content change
                setTimeout(() => this.synchronizeColumnWidths(), 0);
            }

            const updateTime = performance.now() - startTime;
            if (updateTime > 50) {
                console.log(`TableVirtualizer: DOM update took ${updateTime.toFixed(2)}ms for ${visibleRows.length} rows`);
            }

            // Dispatch virtualization update event
            this.grid.dispatchExtensionEvent('virtualization-update', {
                oldRange,
                newRange,
                visibleRowCount: visibleRows.length,
                totalRows: this.totalRows
            });
        });
    }

    /**
     * Remove scroll event listeners
     */
    removeScrollListeners() {
        if (this.scrollContainer) {
            this.scrollContainer.removeEventListener('scroll', this._onScroll);
        }
        window.removeEventListener('resize', this._onResize);
    }

    /**
     * Set row height for virtualization calculations
     * @param {number} height - Row height in pixels
     */
    setRowHeight(height) {
        if (typeof height === 'number' && height > 0) {
            this.rowHeight = height;
            // Recalculate if already virtualized
            if (this.scrollContainer) {
                this.updateVisibleRange(this.scrollContainer.scrollTop);
            }
        }
    }

    /**
     * Set overscan count (extra rows to render)
     * @param {number} count - Number of extra rows
     */
    setOverscan(count) {
        if (typeof count === 'number' && count >= 0) {
            this.overscan = count;
        }
    }

    /**
     * Get virtualization performance metrics
     * @returns {Object} Performance data
     */
    getPerformanceMetrics() {
        return {
            enabled: this.totalRows > 50,
            totalRows: this.totalRows,
            visibleRows: this.visibleRange.end - this.visibleRange.start,
            renderCount: this.renderCount,
            lastRenderTime: this.lastRenderTime,
            rowHeight: this.rowHeight,
            overscan: this.overscan,
            memoryUsage: {
                renderedRows: this.visibleRange.end - this.visibleRange.start,
                totalRows: this.totalRows,
                efficiency: `${(((this.visibleRange.end - this.visibleRange.start) / this.totalRows) * 100).toFixed(1)}%`
            }
        };
    }

    /**
     * Scroll to specific row index
     * @param {number} rowIndex - Row index to scroll to
     * @param {string} position - Position ('start', 'center', 'end')
     */
    scrollToRow(rowIndex, position = 'start') {
        if (!this.scrollContainer || rowIndex < 0 || rowIndex >= this.totalRows) {
            return;
        }

        let scrollTop;
        const containerHeight = this.scrollContainer.clientHeight;

        switch (position) {
            case 'center':
                scrollTop = (rowIndex * this.rowHeight) - (containerHeight / 2) + (this.rowHeight / 2);
                break;
            case 'end':
                scrollTop = (rowIndex * this.rowHeight) - containerHeight + this.rowHeight;
                break;
            default: // 'start'
                scrollTop = rowIndex * this.rowHeight;
        }

        scrollTop = Math.max(0, Math.min(scrollTop, 
            (this.totalRows * this.rowHeight) - containerHeight));

        this.scrollContainer.scrollTop = scrollTop;
    }

    /**
     * Add CSS styles for table virtualization
     */
    addVirtualizationStyles() {
        const css = `
            /* Enhanced virtualized sticky table styles */
            .sticky-table-wrapper.virtualized {
                height: 100%;
                display: flex;
                flex-direction: column;
                position: relative;
            }

            /* Virtualized header enhancements */
            .sticky-table-header.virtualized {
                position: sticky;
                top: 0;
                z-index: 25; /* Higher than default to ensure visibility */
                background: white;
                border-bottom: 2px solid #d1d9e0;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
                flex-shrink: 0;
            }

            /* Virtualized scrollable container enhancements */
            .sticky-table-container.virtualized {
                flex: 1;
                overflow: auto;
                position: relative;
                will-change: scroll-position;
                -webkit-overflow-scrolling: touch;
                scroll-behavior: auto;
            }

            .virtual-spacer-top,
            .virtual-spacer-bottom {
                width: 100%;
                pointer-events: none;
            }

            .virtual-viewport {
                position: relative;
            }

            /* Virtualized header table styling */
            .swivel-table.sticky-header.virtualized {
                width: 100%;
                table-layout: fixed;
                margin: 0;
                border-collapse: collapse;
            }

            .swivel-table.sticky-header.virtualized thead th {
                background: white;
                position: relative;
                border-bottom: 2px solid #d1d9e0;
                padding: 12px 8px;
                font-weight: 600;
            }

            /* Virtualized body table styling */
            .swivel-table.sticky-body.virtualized {
                width: 100%;
                table-layout: fixed;
                margin: 0;
                border-collapse: collapse;
            }

            .swivel-table.sticky-body.virtualized tbody tr {
                height: ${this.rowHeight}px;
            }

            .swivel-table.sticky-body.virtualized tbody td {
                padding: 8px;
                border-bottom: 1px solid #d0d7de;
                vertical-align: top;
            }

            /* Ensure column widths match between header and body */
            .sticky-table-header.virtualized th,
            .sticky-table-container.virtualized td {
                box-sizing: border-box;
                min-width: 0; /* Allow columns to shrink */
            }

            /* Enhanced scrollbar styling for virtualized tables */
            .sticky-table-container.virtualized {
                scrollbar-width: thin;
                scrollbar-color: #c1c1c1 #f1f1f1;
            }

            .sticky-table-container.virtualized::-webkit-scrollbar {
                width: 12px;
                height: 12px;
            }

            .sticky-table-container.virtualized::-webkit-scrollbar-track {
                background: #f1f1f1;
                border-radius: 6px;
            }

            .sticky-table-container.virtualized::-webkit-scrollbar-thumb {
                background: #c1c1c1;
                border-radius: 6px;
                border: 2px solid #f1f1f1;
            }

            .sticky-table-container.virtualized::-webkit-scrollbar-thumb:hover {
                background: #a8a8a8;
            }

            .sticky-table-container.virtualized::-webkit-scrollbar-corner {
                background: #f1f1f1;
            }

            /* Legacy support for old virtualized structure */
            .virtualized-table-wrapper {
                height: 100%;
                display: flex;
                flex-direction: column;
                position: relative;
            }

            .virtualized-table-header {
                position: sticky;
                top: 0;
                z-index: 20;
                background: white;
                border-bottom: 1px solid #d1d9e0;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            }

            .virtualized-table-container {
                flex: 1;
                overflow: auto;
                position: relative;
                will-change: scroll-position;
                -webkit-overflow-scrolling: touch;
                scroll-behavior: auto;
            }
        `;

        const grid = this.getGrid();
        if (grid && grid.addExtensionStyles) {
            grid.addExtensionStyles(css, 'table-virtualizer');
        }
    }

    /**
     * Remove virtualization styles
     */
    removeVirtualizationStyles() {
        const grid = this.getGrid();
        if (grid && grid.removeExtensionStyles) {
            grid.removeExtensionStyles('table-virtualizer');
        }
    }
}

// Export for use in both ES modules and browser globals
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TableVirtualizer;
} else if (typeof window !== 'undefined') {
    window.TableVirtualizer = TableVirtualizer;
}