/**
 * PaginationExtension for SwivelGrid
 * Handles infinite scroll, page-based data loading, and threshold-triggered prefetching
 * Extracted from core SwivelGrid to support modular architecture
 */
class PaginationExtension extends BaseExtension {
    constructor() {
        super('pagination');
        this.priority = 5; // Should load early for scroll handling
    }

    onInitialize(gridInstance) {
        this.grid = gridInstance;
        
        // Pagination properties
        this._pageSize = 100;
        this._totalPages = null;
        this._currentPage = 1;
        this._loading = false;
        this._loadMoreCallback = null;
        this._endReached = false;
        this._lastTriggeredPage = 0;
        this._intersectionObserver = null;
        
        // Handler properties
        this._pageUpHandler = null;
        this._pageDownHandler = null;
        
        // Scroll handling
        this._scrollContainer = null;
        this._isScrolling = false;
        this._onScroll = this._handleScroll.bind(this);
        
        // Add pagination API to grid instance
        this._addPaginationAPI();
        
        // Add pagination styles
        this.addPaginationStyles();
    }

    onDestroy() {
        this._unbindScrollListeners();
        this._removeIntersectionObserver();
        this.removePaginationStyles();
    }

    onAfterRender(context) {
        // Set up scroll listeners after rendering
        this._bindScrollListeners();
        this._bindLoadMoreEvents();
        
        return context;
    }

    onBeforeRender(context) {
        // Add pagination data to context
        context.pagination = {
            loading: this._loading,
            currentPage: this._currentPage,
            pageSize: this._pageSize,
            totalPages: this._totalPages,
            endReached: this._endReached
        };
        
        // Add load more HTML to context if needed
        context.loadMoreHTML = this._renderLoadMore();
        
        return context;
    }

    /**
     * Add pagination API methods to grid instance
     */
    _addPaginationAPI() {
        const grid = this.getGrid();
        
        // Page size property
        Object.defineProperty(grid, 'pageSize', {
            get: () => this._pageSize,
            set: (value) => {
                this._pageSize = typeof value === 'number' && value > 0 ? value : 100;
                this._updateCurrentPage();
            }
        });
        
        // Total pages property
        Object.defineProperty(grid, 'totalPages', {
            get: () => this._totalPages,
            set: (value) => {
                this._totalPages = typeof value === 'number' && value > 0 ? value : null;
                this._endReached = false; // Reset end flag when totalPages changes
            }
        });
        
        // Loading property
        Object.defineProperty(grid, 'loading', {
            get: () => this._loading,
            set: (value) => {
                this._loading = Boolean(value);
                grid.render(); // Re-render to update loading state
            }
        });
        
        // Load more callback property
        Object.defineProperty(grid, 'loadMoreCallback', {
            get: () => this._loadMoreCallback,
            set: (value) => {
                this._loadMoreCallback = typeof value === 'function' ? value : null;
            }
        });
        
        // Page handlers
        Object.defineProperty(grid, 'pageUpHandler', {
            get: () => this._pageUpHandler,
            set: (value) => {
                this._pageUpHandler = typeof value === 'function' ? value : null;
            }
        });
        
        Object.defineProperty(grid, 'pageDownHandler', {
            get: () => this._pageDownHandler,
            set: (value) => {
                this._pageDownHandler = typeof value === 'function' ? value : null;
            }
        });
        
        // Public methods
        grid.setPageData = this.setPageData.bind(this);
        grid.appendData = this.appendData.bind(this);
    }

    /**
     * Set data for a specific page
     * @param {Array} data - Page data
     * @param {number} pageNumber - Page number (optional)
     */
    setPageData(data, pageNumber) {
        if (!Array.isArray(data)) return;
        
        const grid = this.getGrid();
        
        if (pageNumber !== undefined && typeof pageNumber === 'number' && pageNumber >= 1) {
            // Replace specific page data
            const startIndex = (pageNumber - 1) * this._pageSize;
            
            // Fill gaps with empty objects instead of null to prevent render errors
            while (grid._rows.length < startIndex) {
                grid._rows.push({}); // Empty object instead of null
            }
            
            // Replace page data
            grid._rows.splice(startIndex, this._pageSize, ...data);
            
            grid.render();
            this._dispatchEvent('data', { type: 'page-set', pageNumber, length: grid._rows.length });
        } else {
            // Append data as new page
            grid._rows.push(...data);
            this._currentPage = Math.ceil(grid._rows.length / this._pageSize);
            
            // Check if sorting is active - if so, we need to handle page boundaries carefully
            const activeSort = grid._schema.find(col => col.sort);
            if (activeSort) {
                // Don't perform client-side sorting when pagination is active
                const isPaginationActive = this._totalPages !== null;
                if (isPaginationActive) {
                    console.warn('PaginationExtension: Client-side sorting disabled when pagination is active. New page data not sorted locally.');
                    this._renderAppendedRows(data);
                } else {
                    // Try to use SortingExtension first
                    const sortingExtension = grid.getExtension('sorting');
                    if (sortingExtension && sortingExtension.enabled) {
                        sortingExtension.sortData(activeSort.key, activeSort.sort, activeSort.sortComparator);
                        grid.render();
                    } else {
                        // Fallback to core implementation
                        if (grid._sortData) {
                            grid._sortData(activeSort.key, activeSort.sort, activeSort.sortComparator);
                        }
                        grid.render();
                    }
                }
            } else {
                this._renderAppendedRows(data);
            }
            
            this._dispatchEvent('data', { type: 'page-append', length: grid._rows.length });
        }
        
        // Reset loading and threshold flags
        this._loading = false;
        this._lastTriggeredPage = 0;
        this._updateCurrentPage();
    }

    /**
     * Append new rows to existing data
     * @param {Array} rows - Rows to append
     */
    appendData(rows) {
        if (!Array.isArray(rows) || rows.length === 0) return;
        
        const grid = this.getGrid();
        grid._rows.push(...rows);
        
        // If there's an active sort, check if we can re-sort
        const activeSort = grid._schema.find(col => col.sort);
        if (activeSort) {
            // Don't perform client-side sorting when pagination is active
            const isPaginationActive = this._totalPages !== null;
            if (isPaginationActive) {
                console.warn('PaginationExtension: Client-side sorting disabled when pagination is active. Appended data not sorted locally.');
                this._renderAppendedRows(rows);
            } else {
                // Try to use SortingExtension first
                const sortingExtension = grid.getExtension('sorting');
                if (sortingExtension && sortingExtension.enabled) {
                    sortingExtension.sortData(activeSort.key, activeSort.sort, activeSort.sortComparator);
                    grid.render();
                } else {
                    // Fallback to core implementation
                    if (grid._sortData) {
                        grid._sortData(activeSort.key, activeSort.sort, activeSort.sortComparator);
                    }
                    grid.render();
                }
            }
        } else {
            // Otherwise, just append the new rows
            this._renderAppendedRows(rows);
        }
        
        this._dispatchEvent('data', { type: 'append', added: rows.length, length: grid._rows.length });
    }

    /**
     * Bind scroll event listeners
     */
    _bindScrollListeners() {
        this._unbindScrollListeners();
        
        const grid = this.getGrid();
        this._scrollContainer = grid.shadowRoot?.querySelector('.scroll-container');
        if (this._scrollContainer) {
            this._scrollContainer.addEventListener('scroll', this._onScroll);
        }
    }

    /**
     * Unbind scroll event listeners
     */
    _unbindScrollListeners() {
        if (this._scrollContainer) {
            this._scrollContainer.removeEventListener('scroll', this._onScroll);
        }
        this._scrollContainer = null;
    }

    /**
     * Handle scroll events with pagination logic
     */
    _handleScroll() {
        if (this._isScrolling) return;
        
        this._isScrolling = true;
        requestAnimationFrame(() => {
            const grid = this.getGrid();
            
            // Get visible row indices using existing robust calculation
            let visibleStartIndex = 0;
            let visibleEndIndex = Math.max(0, grid._rows.length - 1);
            
            const container = this._scrollContainer;
            if (grid._layoutType === 'table') {
                const rows = container.querySelectorAll('tbody tr');
                if (rows.length > 0) {
                    const containerRect = container.getBoundingClientRect();
                    for (let i = 0; i < rows.length; i++) {
                        const rowRect = rows[i].getBoundingClientRect();
                        if (rowRect.bottom > containerRect.top) {
                            visibleStartIndex = i;
                            break;
                        }
                    }
                    for (let i = rows.length - 1; i >= 0; i--) {
                        const rowRect = rows[i].getBoundingClientRect();
                        if (rowRect.top < containerRect.bottom) {
                            visibleEndIndex = i;
                            break;
                        }
                    }
                }
            } else {
                const cards = container.querySelectorAll('.grid-card');
                if (cards.length > 0) {
                    const containerRect = container.getBoundingClientRect();
                    for (let i = 0; i < cards.length; i++) {
                        const cardRect = cards[i].getBoundingClientRect();
                        if (cardRect.bottom > containerRect.top) {
                            visibleStartIndex = i;
                            break;
                        }
                    }
                    for (let i = cards.length - 1; i >= 0; i--) {
                        const cardRect = cards[i].getBoundingClientRect();
                        if (cardRect.top < containerRect.bottom) {
                            visibleEndIndex = i;
                            break;
                        }
                    }
                }
            }
            
            // Calculate page based purely on visible indices
            const visibleMidpoint = Math.floor((visibleStartIndex + visibleEndIndex) / 2);
            const currentPage = Math.max(1, Math.ceil((visibleMidpoint + 1) / this._pageSize));
            
            // Check for page changes
            if (currentPage !== this._currentPage) {
                const oldPage = this._currentPage;
                this._currentPage = currentPage;
                
                if (currentPage > oldPage) {
                    this._pageDownHandler?.(currentPage);
                    this._dispatchEvent('pageDown', { pageNumber: currentPage });
                } else if (currentPage < oldPage) {
                    this._pageUpHandler?.(currentPage);
                    this._dispatchEvent('pageUp', { pageNumber: currentPage });
                }
            }
            
            // Check 80% threshold for preloading (index-based)
            this._checkThresholdTrigger(currentPage, visibleEndIndex);
            
            this._isScrolling = false;
        });
    }

    /**
     * Check threshold trigger for preloading
     * @param {number} currentPage - Current page number
     * @param {number} visibleEndIndex - Last visible row index
     */
    _checkThresholdTrigger(currentPage, visibleEndIndex) {
        // Skip if loading, end reached, or already triggered this page
        if (this._loading || this._endReached || currentPage === this._lastTriggeredPage) {
            return;
        }
        
        // Skip if we've reached totalPages
        if (this._totalPages && currentPage >= this._totalPages) {
            this._endReached = true;
            return;
        }
        
        const pageStartIndex = (currentPage - 1) * this._pageSize;
        const pageEndIndex = Math.min(pageStartIndex + this._pageSize, this.getGrid()._rows.length);
        const pageSize = pageEndIndex - pageStartIndex;
        
        // Guard against division by zero or empty pages
        if (pageSize <= 0) return;
        
        const progressInPage = Math.max(0, visibleEndIndex - pageStartIndex);
        const pageProgressPercent = Math.min(1, progressInPage / pageSize);
        
        if (pageProgressPercent >= 0.8) {
            this._lastTriggeredPage = currentPage;
            const nextPage = currentPage + 1;
            
            // Dispatch threshold event
            this._dispatchEvent('pageThreshold', { 
                pageNumber: currentPage, 
                threshold: 0.8, 
                nextPage 
            });
            
            // Auto-prefetch if callback is set
            if (this._loadMoreCallback && (!this._totalPages || nextPage <= this._totalPages)) {
                this._loading = true;
                this._loadMoreCallback();
            }
        }
    }

    /**
     * Render load more section
     * @returns {string} Load more HTML
     */
    _renderLoadMore() {
        // Only show load more section if totalPages is set and we haven't reached the end
        if (this._totalPages && this._currentPage < this._totalPages) {
            return `<div class="load-more-section">${this._getLoadMoreContent()}</div>`;
        }
        return '';
    }

    /**
     * Get load more content based on state
     * @returns {string} Load more content HTML
     */
    _getLoadMoreContent() {
        if (this._loading) {
            return '<div class="spinner"></div>Loading more...';
        }
        
        if (this._loadMoreCallback) {
            return '<button class="load-more-button" id="load-more-btn">Load More</button>';
        }
        
        return '<div style="color: #6c757d;">Scroll to load more content</div>';
    }

    /**
     * Bind load more button events
     */
    _bindLoadMoreEvents() {
        const grid = this.getGrid();
        const loadMoreBtn = grid.shadowRoot?.getElementById('load-more-btn');
        if (loadMoreBtn && this._loadMoreCallback) {
            loadMoreBtn.addEventListener('click', () => {
                this._loadMoreCallback();
            });
        }
    }

    /**
     * Render appended rows efficiently without full re-render
     * @param {Array} newRows - New rows to append
     */
    _renderAppendedRows(newRows) {
        const grid = this.getGrid();
        const layoutRendererExtension = grid.getExtension('layout-renderer');
        
        if (layoutRendererExtension && layoutRendererExtension.enabled) {
            // Use LayoutRendererExtension for efficient appending
            layoutRendererExtension.renderAppendedRows(
                newRows, 
                grid._layoutType, 
                grid._schema
            );
        } else {
            // Fallback: full re-render
            grid.render();
        }
    }

    /**
     * Update current page based on data length
     */
    _updateCurrentPage() {
        const grid = this.getGrid();
        if (grid._rows.length === 0) {
            this._currentPage = 1;
        } else {
            this._currentPage = Math.ceil(grid._rows.length / this._pageSize);
        }
    }

    /**
     * Remove intersection observer
     */
    _removeIntersectionObserver() {
        if (this._intersectionObserver) {
            this._intersectionObserver.disconnect();
            this._intersectionObserver = null;
        }
    }

    /**
     * Dispatch custom events
     * @param {string} type - Event type
     * @param {Object} detail - Event detail
     */
    _dispatchEvent(type, detail) {
        const grid = this.getGrid();
        grid.dispatchEvent(new CustomEvent(`swivel:${type}`, {
            bubbles: true,
            composed: true,
            detail
        }));
    }

    /**
     * Get pagination state
     * @returns {Object} Pagination state
     */
    getPaginationState() {
        return {
            pageSize: this._pageSize,
            totalPages: this._totalPages,
            currentPage: this._currentPage,
            loading: this._loading,
            endReached: this._endReached,
            lastTriggeredPage: this._lastTriggeredPage
        };
    }

    /**
     * Reset pagination state
     */
    resetPaginationState() {
        this._currentPage = 1;
        this._loading = false;
        this._endReached = false;
        this._lastTriggeredPage = 0;
    }

    /**
     * Add CSS styles for pagination UI elements
     */
    addPaginationStyles() {
        const css = `
            /* Load more section styles */
            .load-more-section {
                padding: 20px;
                text-align: center;
                border-top: 1px solid var(--border-color);
                background: #f8f9fa;
            }

            .load-more-button {
                padding: 12px 24px;
                background: var(--primary-color, #007bff);
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: background-color 0.2s;
            }

            .load-more-button:hover {
                background: var(--primary-color-hover, #0056a3);
            }

            .load-more-button:disabled {
                background: #6c757d;
                cursor: not-allowed;
            }

            .spinner {
                display: inline-block;
                width: 20px;
                height: 20px;
                border: 2px solid #f3f3f3;
                border-top: 2px solid var(--primary-color, #007bff);
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-right: 8px;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;

        const grid = this.getGrid();
        if (grid && grid.addExtensionStyles) {
            grid.addExtensionStyles(css, 'pagination');
        }
    }

    /**
     * Remove pagination styles from the grid
     */
    removePaginationStyles() {
        const grid = this.getGrid();
        if (grid && grid.removeExtensionStyles) {
            grid.removeExtensionStyles('pagination');
        }
    }
}

// Export for use in both ES modules and browser globals
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PaginationExtension;
} else if (typeof window !== 'undefined') {
    window.PaginationExtension = PaginationExtension;
}