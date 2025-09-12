/**
 * SearchExtension for SwivelGrid
 * Handles external search input binding and search event management
 * Extracted from core SwivelGrid to support modular architecture
 */
class SearchExtension extends BaseExtension {
    constructor() {
        super('search');
        this.priority = 40; // Should load after layout, column types, and sorting
        this.searchInputListener = null;
        this.currentSearchInput = null;
    }

    onInitialize(gridInstance) {
        this.grid = gridInstance;
        this.bindSearchInput();
    }

    onDestroy() {
        this.unbindSearchInput();
    }

    /**
     * Bind to an external search input element
     * @param {string} selector - CSS selector for the search input
     */
    bindSearchInput(selector = null) {
        // Use provided selector or get from grid state
        const gridState = this.getGridState();
        const searchInput = selector || gridState.searchInput;
        
        // Unbind previous input
        this.unbindSearchInput();
        
        if (searchInput) {
            const input = document.querySelector(searchInput);
            if (input) {
                this.currentSearchInput = searchInput;
                this.searchInputListener = (e) => {
                    const query = e.target.value;
                    this.handleSearch(query);
                };
                input.addEventListener('input', this.searchInputListener);
                
                // Store cleanup for this extension
                this.grid.addExtensionEventListener('search-input-bound', () => {}, this.name);
            }
        }
    }

    /**
     * Unbind from the current search input
     */
    unbindSearchInput() {
        if (this.searchInputListener && this.currentSearchInput) {
            const input = document.querySelector(this.currentSearchInput);
            if (input) {
                input.removeEventListener('input', this.searchInputListener);
            }
        }
        this.searchInputListener = null;
        this.currentSearchInput = null;
        
        // Clean up extension event listeners
        this.grid.cleanupExtensionEventListeners?.(this.name);
    }

    /**
     * Handle search input changes
     * @param {string} query - Search query string
     */
    handleSearch(query) {
        const grid = this.getGrid();
        
        // Call search handler if available
        if (grid._searchHandler) {
            grid._searchHandler(query);
        }
        
        // Dispatch search event
        grid.dispatchExtensionEvent('search', { query });
        
        // Store current search query
        this.currentQuery = query;
    }

    /**
     * Get the current search query
     * @returns {string} Current search query
     */
    getCurrentQuery() {
        return this.currentQuery || '';
    }

    /**
     * Set search query programmatically (triggers search)
     * @param {string} query - Search query to set
     */
    setSearchQuery(query) {
        if (this.currentSearchInput) {
            const input = document.querySelector(this.currentSearchInput);
            if (input) {
                input.value = query;
                // Trigger the search handler
                this.handleSearch(query);
            }
        } else {
            // Just trigger search without updating input
            this.handleSearch(query);
        }
    }

    /**
     * Clear the search query
     */
    clearSearch() {
        this.setSearchQuery('');
    }

    /**
     * Check if search input is currently bound
     * @returns {boolean} Whether search input is bound
     */
    isSearchInputBound() {
        return !!(this.searchInputListener && this.currentSearchInput);
    }

    /**
     * Get information about the current search state
     * @returns {Object} Search state information
     */
    getSearchState() {
        return {
            isInputBound: this.isSearchInputBound(),
            searchInput: this.currentSearchInput,
            currentQuery: this.getCurrentQuery(),
            hasSearchHandler: !!(this.grid._searchHandler)
        };
    }

    /**
     * Update search input binding when grid's searchInput changes
     * @param {Object} context - Render context
     * @returns {Object} Modified context
     */
    onBeforeRender(context) {
        // Check if searchInput has changed and update binding
        if (context.searchInput !== this.currentSearchInput) {
            this.bindSearchInput(context.searchInput);
        }
        
        return context;
    }

    /**
     * Set up search input binding after render
     * @param {Object} context - Render context
     * @param {HTMLElement} renderedElement - Rendered DOM element
     */
    onAfterRender(context, renderedElement) {
        // Ensure search input is bound after render
        if (context.searchInput && !this.isSearchInputBound()) {
            this.bindSearchInput(context.searchInput);
        }
    }

    /**
     * Advanced search functionality - filter data client-side
     * @param {Array} data - Data array to filter
     * @param {string} query - Search query
     * @param {Array} columns - Columns to search in (optional)
     * @returns {Array} Filtered data
     */
    filterData(data, query, columns = null) {
        if (!query || !data || !Array.isArray(data)) {
            return data;
        }

        const searchTerm = query.toLowerCase().trim();
        if (!searchTerm) {
            return data;
        }

        const gridState = this.getGridState();
        const searchColumns = columns || gridState.schema;

        return data.filter(row => {
            return searchColumns.some(column => {
                const value = row[column.key];
                if (value == null) return false;

                // Handle template-based search with TemplateExtension
                const templateExt = this.grid?.getExtension('templates');
                if (templateExt && templateExt.enabled && column.cellTemplate) {
                    // Detect template type and search accordingly
                    if (column.cellTemplate.includes('renderRating')) {
                        const rating = templateExt.parseRating(value);
                        return rating.isValid && 
                               (rating.value.toString().includes(searchTerm) ||
                                `${rating.value}/${rating.max}`.includes(searchTerm));
                    } else if (column.cellTemplate.includes('renderImage')) {
                        const image = templateExt.parseImage(value);
                        return image.alt.toLowerCase().includes(searchTerm) ||
                               image.src.toLowerCase().includes(searchTerm);
                    } else if (column.cellTemplate.includes('formatDate')) {
                        // Search in formatted date text
                        const formattedDate = templateExt.formatDate ? templateExt.formatDate(value) : String(value);
                        return formattedDate.toLowerCase().includes(searchTerm);
                    } else if (column.cellTemplate.includes('formatNumber') || column.cellTemplate.includes('formatCurrency')) {
                        // Search in formatted number/currency text
                        const formattedValue = column.cellTemplate.includes('formatCurrency') ? 
                            (templateExt.formatCurrency ? templateExt.formatCurrency(value) : String(value)) :
                            (templateExt.formatNumber ? templateExt.formatNumber(value) : String(value));
                        return formattedValue.toLowerCase().includes(searchTerm);
                    }
                }
                
                // Default text search
                return String(value).toLowerCase().includes(searchTerm);
            });
        });
    }

    /**
     * Create a search input element and bind to it
     * @param {Object} options - Search input options
     * @returns {HTMLElement} Created input element
     */
    createSearchInput(options = {}) {
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = options.placeholder || 'Search...';
        input.className = options.className || 'swivel-grid-search';
        
        if (options.id) {
            input.id = options.id;
        }

        // Bind to this input
        document.body.appendChild(input); // Temporarily add to DOM
        this.bindSearchInput(`#${input.id || '.swivel-grid-search'}`);
        
        return input;
    }

    /**
     * Debounce search input to reduce API calls
     * @param {Function} searchFunction - Function to call for search
     * @param {number} delay - Debounce delay in milliseconds
     * @returns {Function} Debounced search function
     */
    debounceSearch(searchFunction, delay = 300) {
        let timeoutId;
        return (query) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                searchFunction(query);
            }, delay);
        };
    }

    /**
     * Set up debounced search handler
     * @param {Function} searchFunction - Search function to debounce
     * @param {number} delay - Debounce delay
     */
    setupDebouncedSearch(searchFunction, delay = 300) {
        const grid = this.getGrid();
        const debouncedSearch = this.debounceSearch(searchFunction, delay);
        
        // Override the search handler
        grid._searchHandler = debouncedSearch;
    }
}

// Export for use in both ES modules and browser globals
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SearchExtension;
} else if (typeof window !== 'undefined') {
    window.SearchExtension = SearchExtension;
}