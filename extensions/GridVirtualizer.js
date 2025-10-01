/**
 * GridVirtualizer for SwivelGrid
 * Provides virtualization for grid layout with variable-height estimation.
 * Handles responsive column calculations and efficient rendering of large card datasets.
 */
class GridVirtualizer extends BaseExtension {
    constructor() {
        super('grid-virtualizer');
        this.priority = 15; // Load after layout renderer but before other features
        
        // Virtualization settings
        this.estimatedCardHeight = 200; // Estimated card height in pixels
        this.minCardWidth = 250; // Minimum card width
        this.gap = 16; // Gap between cards
        this.overscan = 10; // Number of extra cards to render outside viewport
        
        // Layout state
        this.scrollContainer = null;
        this.viewport = null;
        this.spacerTop = null;
        this.spacerBottom = null;
        
        // Grid calculations
        this.totalCards = 0;
        this.columnsPerRow = 1;
        this.cardDimensions = { width: 0, height: 0 };
        this.visibleRange = { start: 0, end: 0 };
        this.heightCache = new Map(); // Cache actual card heights
        
        // State management
        this.lastScrollTop = 0;
        this.isScrolling = false;
        this.scrollTimeout = null;
        this.resizeObserver = null;
        
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
        
        // Set up resize observer for responsive behavior
        this.setupResizeObserver();
    }

    onDestroy() {
        this.removeScrollListeners();
        this.removeVirtualizationStyles();
        this._restoreLayoutRenderer();
        this.disconnectResizeObserver();
    }

    onAfterRender(context, renderedElement) {
        // Only virtualize grid layout
        if (context.layoutType !== 'grid') {
            return context;
        }

        this.setupVirtualization();
        return context;
    }

    /**
     * Override layout renderer to inject grid virtualization
     */
    _overrideLayoutRenderer() {
        const layoutExt = this.grid.getExtension('layout-renderer');
        if (layoutExt && layoutExt.enabled) {
            // Store original render method
            this._originalRenderGrid = layoutExt.renderGrid;
            
            // Override with virtualized version
            layoutExt.renderGrid = (rows, schema, options = {}) => {
                if (this.isVirtualizationEnabled(rows.length)) {
                    return this.renderVirtualizedGrid(rows, schema, options);
                } else {
                    // Use original implementation for small datasets
                    return this._originalRenderGrid.call(layoutExt, rows, schema, options);
                }
            };
        }
    }

    /**
     * Restore original layout renderer
     */
    _restoreLayoutRenderer() {
        const layoutExt = this.grid.getExtension('layout-renderer');
        if (layoutExt && this._originalRenderGrid) {
            layoutExt.renderGrid = this._originalRenderGrid;
        }
    }

    /**
     * Check if virtualization should be enabled
     * @param {number} cardCount - Number of cards
     * @returns {boolean} Whether to enable virtualization
     */
    isVirtualizationEnabled(cardCount) {
        // Enable virtualization for datasets larger than 20 cards
        return cardCount > 20;
    }

    /**
     * Render virtualized grid
     * @param {Array} rows - All card data
     * @param {Array} schema - Column schema
     * @param {Object} options - Render options
     * @returns {string} Virtualized grid HTML
     */
    renderVirtualizedGrid(rows, schema, options = {}) {
        this.totalCards = rows.length;
        
        // Calculate grid layout
        this.calculateGridLayout();
        
        // Calculate initial visible range
        this.visibleRange = this.calculateVisibleRange(0);
        
        const visibleRows = rows.slice(this.visibleRange.start, this.visibleRange.end);
        
        // Render grid structure with virtualization containers
        const gridHTML = `
            <div class="virtualized-grid-container">
                <div class="virtual-spacer-top"></div>
                <div class="virtual-viewport">
                    ${this.renderGridContent(visibleRows, schema, this.visibleRange.start)}
                </div>
                <div class="virtual-spacer-bottom"></div>
            </div>
        `;

        this.renderCount++;
        this.lastRenderTime = performance.now();

        return gridHTML;
    }

    /**
     * Calculate grid layout parameters
     */
    calculateGridLayout() {
        const containerWidth = this.scrollContainer ? 
            this.scrollContainer.clientWidth : 
            this.getGrid().shadowRoot?.querySelector('.scroll-container')?.clientWidth || 800;

        // Calculate columns per row
        this.columnsPerRow = Math.floor((containerWidth + this.gap) / (this.minCardWidth + this.gap));
        this.columnsPerRow = Math.max(1, this.columnsPerRow);

        // Calculate actual card width
        const availableWidth = containerWidth - (this.gap * (this.columnsPerRow - 1));
        this.cardDimensions.width = Math.floor(availableWidth / this.columnsPerRow);
        this.cardDimensions.height = this.estimatedCardHeight;
    }

    /**
     * Render grid content
     * @param {Array} visibleRows - Visible card data
     * @param {Array} schema - Column schema
     * @param {number} startIndex - Starting card index
     * @returns {string} Grid HTML
     */
    renderGridContent(visibleRows, schema, startIndex) {
        const layoutExt = this.grid.getExtension('layout-renderer');
        if (!layoutExt) {
            return '<div>LayoutRendererExtension required for virtualization</div>';
        }

        // Render visible cards
        const cardsHTML = visibleRows.map((row, index) => {
            const cardIndex = startIndex + index;
            const cardHTML = layoutExt.renderGridCard(row, schema, cardIndex);
            
            // Wrap card with virtualization metadata
            return `
                <div class="virtual-card" 
                     data-index="${cardIndex}"
                     style="width: ${this.cardDimensions.width}px; min-height: ${this.cardDimensions.height}px;">
                    ${cardHTML}
                </div>
            `;
        }).join('');

        return `
            <div class="virtual-grid-content" 
                 style="grid-template-columns: repeat(${this.columnsPerRow}, 1fr); gap: ${this.gap}px;">
                ${cardsHTML}
            </div>
        `;
    }

    /**
     * Set up virtualization after render
     */
    setupVirtualization() {
        const grid = this.getGrid();
        const shadowRoot = grid.shadowRoot;
        if (!shadowRoot) return;

        // Find scroll container
        this.scrollContainer = shadowRoot.querySelector('.scroll-container') || 
                              shadowRoot.querySelector('.virtualized-grid-container');
        
        if (!this.scrollContainer) return;

        // Get virtualization elements
        this.viewport = shadowRoot.querySelector('.virtual-viewport');
        this.spacerTop = shadowRoot.querySelector('.virtual-spacer-top');
        this.spacerBottom = shadowRoot.querySelector('.virtual-spacer-bottom');

        // Calculate initial layout
        this.calculateGridLayout();
        this.updateSpacers();

        // Set up scroll listeners
        this.removeScrollListeners();
        this.scrollContainer.addEventListener('scroll', this._onScroll, { passive: true });
        window.addEventListener('resize', this._onResize, { passive: true });

        // Cache initial card heights
        this.cacheVisibleCardHeights();
    }

    /**
     * Set up ResizeObserver for responsive grid behavior
     */
    setupResizeObserver() {
        if (typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(entries => {
                // Debounce resize events
                if (this.resizeTimeout) {
                    clearTimeout(this.resizeTimeout);
                }
                
                this.resizeTimeout = setTimeout(() => {
                    this.calculateGridLayout();
                    this.updateVisibleRange(this.lastScrollTop);
                }, 100);
            });
        }
    }

    /**
     * Disconnect ResizeObserver
     */
    disconnectResizeObserver() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
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

        // Use RAF for smooth scrolling
        requestAnimationFrame(() => {
            const scrollTop = this.scrollContainer.scrollTop;
            
            // Only update if scroll position changed significantly
            if (Math.abs(scrollTop - this.lastScrollTop) > this.estimatedCardHeight / 4) {
                this.updateVisibleRange(scrollTop);
                this.lastScrollTop = scrollTop;
            }

            // Set timeout to mark scrolling as finished
            this.scrollTimeout = setTimeout(() => {
                this.isScrolling = false;
                // Cache heights of newly visible cards
                this.cacheVisibleCardHeights();
            }, 150);
        });
    }

    /**
     * Handle window resize
     */
    _handleResize() {
        // Recalculate grid layout and visible range on resize
        if (this.scrollContainer) {
            requestAnimationFrame(() => {
                this.calculateGridLayout();
                this.updateVisibleRange(this.scrollContainer.scrollTop);
            });
        }
    }

    /**
     * Calculate visible range based on scroll position
     * @param {number} scrollTop - Current scroll position
     * @returns {Object} Visible range {start, end}
     */
    calculateVisibleRange(scrollTop) {
        const containerHeight = this.scrollContainer ? 
            this.scrollContainer.clientHeight : 400; // fallback height

        // Estimate which rows are visible
        const avgRowHeight = this.getAverageRowHeight();
        const estimatedStartRow = Math.floor(scrollTop / avgRowHeight);
        const estimatedVisibleRows = Math.ceil(containerHeight / avgRowHeight) + 2; // +2 for safety

        // Convert row indices to card indices
        const startIndex = Math.max(0, estimatedStartRow * this.columnsPerRow - this.overscan);
        const endIndex = Math.min(this.totalCards, 
            (estimatedStartRow + estimatedVisibleRows) * this.columnsPerRow + this.overscan);

        return { start: startIndex, end: endIndex };
    }

    /**
     * Get average row height based on cached heights
     * @returns {number} Average row height
     */
    getAverageRowHeight() {
        if (this.heightCache.size === 0) {
            return this.estimatedCardHeight + this.gap;
        }

        // Group cards by rows and calculate row heights
        const rowHeights = [];
        let currentRowMaxHeight = 0;
        let cardsInCurrentRow = 0;

        for (const [index, height] of this.heightCache.entries()) {
            if (cardsInCurrentRow === this.columnsPerRow) {
                rowHeights.push(currentRowMaxHeight + this.gap);
                currentRowMaxHeight = height;
                cardsInCurrentRow = 1;
            } else {
                currentRowMaxHeight = Math.max(currentRowMaxHeight, height);
                cardsInCurrentRow++;
            }
        }

        if (cardsInCurrentRow > 0) {
            rowHeights.push(currentRowMaxHeight + this.gap);
        }

        const average = rowHeights.reduce((sum, height) => sum + height, 0) / rowHeights.length;
        return average || (this.estimatedCardHeight + this.gap);
    }

    /**
     * Cache heights of visible cards for better estimation
     */
    cacheVisibleCardHeights() {
        if (!this.viewport) return;

        const cards = this.viewport.querySelectorAll('.virtual-card');
        cards.forEach(card => {
            const index = parseInt(card.dataset.index, 10);
            if (!isNaN(index)) {
                const height = card.offsetHeight;
                this.heightCache.set(index, height);
            }
        });

        // Limit cache size to prevent memory issues
        if (this.heightCache.size > 1000) {
            const entries = Array.from(this.heightCache.entries());
            entries.slice(0, entries.length - 500).forEach(([key]) => {
                this.heightCache.delete(key);
            });
        }
    }

    /**
     * Update visible range and re-render if needed
     * @param {number} scrollTop - Current scroll position
     */
    updateVisibleRange(scrollTop) {
        const newRange = this.calculateVisibleRange(scrollTop);
        
        // Only update if range changed significantly
        if (Math.abs(newRange.start - this.visibleRange.start) > this.columnsPerRow ||
            Math.abs(newRange.end - this.visibleRange.end) > this.columnsPerRow) {
            
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
        if (!this.viewport) return;

        const gridState = this.getGridState();
        const visibleRows = gridState.rows.slice(newRange.start, newRange.end);
        
        // Update spacers
        this.updateSpacers();

        // Update viewport content
        const layoutExt = this.grid.getExtension('layout-renderer');
        if (layoutExt) {
            const cardsHTML = visibleRows.map((row, index) => {
                const cardIndex = newRange.start + index;
                const cardHTML = layoutExt.renderGridCard(row, gridState.schema, cardIndex);
                
                return `
                    <div class="virtual-card" 
                         data-index="${cardIndex}"
                         style="width: ${this.cardDimensions.width}px; min-height: ${this.cardDimensions.height}px;">
                        ${cardHTML}
                    </div>
                `;
            }).join('');
            
            const gridContent = this.viewport.querySelector('.virtual-grid-content');
            if (gridContent) {
                gridContent.innerHTML = cardsHTML;
                gridContent.style.gridTemplateColumns = `repeat(${this.columnsPerRow}, 1fr)`;
                gridContent.style.gap = `${this.gap}px`;
            }
        }

        // Dispatch virtualization update event
        this.grid.dispatchExtensionEvent('virtualization-update', {
            oldRange,
            newRange,
            visibleCardCount: visibleRows.length,
            totalCards: this.totalCards,
            columnsPerRow: this.columnsPerRow
        });
    }

    /**
     * Update spacer heights based on current state
     */
    updateSpacers() {
        if (!this.spacerTop || !this.spacerBottom) return;

        const avgRowHeight = this.getAverageRowHeight();
        const topRows = Math.ceil(this.visibleRange.start / this.columnsPerRow);
        const bottomRows = Math.ceil((this.totalCards - this.visibleRange.end) / this.columnsPerRow);

        this.spacerTop.style.height = `${topRows * avgRowHeight}px`;
        this.spacerBottom.style.height = `${bottomRows * avgRowHeight}px`;
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
     * Set estimated card height for calculations
     * @param {number} height - Estimated card height in pixels
     */
    setEstimatedCardHeight(height) {
        if (typeof height === 'number' && height > 0) {
            this.estimatedCardHeight = height;
            this.cardDimensions.height = height;
            // Recalculate if already virtualized
            if (this.scrollContainer) {
                this.updateVisibleRange(this.scrollContainer.scrollTop);
            }
        }
    }

    /**
     * Set minimum card width
     * @param {number} width - Minimum card width in pixels
     */
    setMinCardWidth(width) {
        if (typeof width === 'number' && width > 0) {
            this.minCardWidth = width;
            // Recalculate layout
            this.calculateGridLayout();
            if (this.scrollContainer) {
                this.updateVisibleRange(this.scrollContainer.scrollTop);
            }
        }
    }

    /**
     * Set gap between cards
     * @param {number} gap - Gap in pixels
     */
    setGap(gap) {
        if (typeof gap === 'number' && gap >= 0) {
            this.gap = gap;
            // Recalculate layout
            this.calculateGridLayout();
            if (this.scrollContainer) {
                this.updateVisibleRange(this.scrollContainer.scrollTop);
            }
        }
    }

    /**
     * Set overscan count (extra cards to render)
     * @param {number} count - Number of extra cards
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
            enabled: this.totalCards > 20,
            totalCards: this.totalCards,
            visibleCards: this.visibleRange.end - this.visibleRange.start,
            columnsPerRow: this.columnsPerRow,
            renderCount: this.renderCount,
            lastRenderTime: this.lastRenderTime,
            estimatedCardHeight: this.estimatedCardHeight,
            cardWidth: this.cardDimensions.width,
            gap: this.gap,
            overscan: this.overscan,
            heightCacheSize: this.heightCache.size,
            memoryUsage: {
                renderedCards: this.visibleRange.end - this.visibleRange.start,
                totalCards: this.totalCards,
                efficiency: `${(((this.visibleRange.end - this.visibleRange.start) / this.totalCards) * 100).toFixed(1)}%`
            }
        };
    }

    /**
     * Scroll to specific card index
     * @param {number} cardIndex - Card index to scroll to
     * @param {string} position - Position ('start', 'center', 'end')
     */
    scrollToCard(cardIndex, position = 'start') {
        if (!this.scrollContainer || cardIndex < 0 || cardIndex >= this.totalCards) {
            return;
        }

        const rowIndex = Math.floor(cardIndex / this.columnsPerRow);
        const avgRowHeight = this.getAverageRowHeight();
        const containerHeight = this.scrollContainer.clientHeight;

        let scrollTop;

        switch (position) {
            case 'center':
                scrollTop = (rowIndex * avgRowHeight) - (containerHeight / 2) + (avgRowHeight / 2);
                break;
            case 'end':
                scrollTop = (rowIndex * avgRowHeight) - containerHeight + avgRowHeight;
                break;
            default: // 'start'
                scrollTop = rowIndex * avgRowHeight;
        }

        const maxScroll = (Math.ceil(this.totalCards / this.columnsPerRow) * avgRowHeight) - containerHeight;
        scrollTop = Math.max(0, Math.min(scrollTop, maxScroll));

        this.scrollContainer.scrollTop = scrollTop;
    }

    /**
     * Add CSS styles for grid virtualization
     */
    addVirtualizationStyles() {
        const css = `
            .virtualized-grid-container {
                height: 100%;
                overflow: auto;
                position: relative;
            }

            .virtual-spacer-top,
            .virtual-spacer-bottom {
                width: 100%;
                pointer-events: none;
            }

            .virtual-viewport {
                position: relative;
            }

            .virtual-grid-content {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(${this.minCardWidth}px, 1fr));
                gap: ${this.gap}px;
                padding: ${this.gap}px;
            }

            .virtual-card {
                position: relative;
                will-change: transform;
            }

            /* Smooth scrolling optimization */
            .virtualized-grid-container {
                will-change: scroll-position;
                -webkit-overflow-scrolling: touch;
                scroll-behavior: auto;
            }

            /* Responsive behavior */
            @media (max-width: 768px) {
                .virtual-grid-content {
                    grid-template-columns: 1fr;
                }
            }
        `;

        const grid = this.getGrid();
        if (grid && grid.addExtensionStyles) {
            grid.addExtensionStyles(css, 'grid-virtualizer');
        }
    }

    /**
     * Remove virtualization styles
     */
    removeVirtualizationStyles() {
        const grid = this.getGrid();
        if (grid && grid.removeExtensionStyles) {
            grid.removeExtensionStyles('grid-virtualizer');
        }
    }
}

// Export for use in both ES modules and browser globals
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GridVirtualizer;
} else if (typeof window !== 'undefined') {
    window.GridVirtualizer = GridVirtualizer;
}