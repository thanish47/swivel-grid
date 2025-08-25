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
        this._pageUpHandler = null;
        this._pageDownHandler = null;
        this._searchHandler = null;
        
        // Infinite scroll properties
        this._pageSize = 100;
        this._totalPages = null;
        this._currentPage = 1;
        this._loading = false;
        this._loadMoreCallback = null;
        this._endReached = false;
        this._lastTriggeredPage = 0;
        this._intersectionObserver = null;
        
        // Internal bindings
        this._searchInputListener = null;
        this._scrollContainer = null;
        this._isScrolling = false;
        this._onScroll = this._handleScroll.bind(this);
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
        this._bindSearchInput();
    }

    get sortHandler() { return this._sortHandler; }
    set sortHandler(value) { this._sortHandler = typeof value === 'function' ? value : null; }

    get pageUpHandler() { return this._pageUpHandler; }
    set pageUpHandler(value) { this._pageUpHandler = typeof value === 'function' ? value : null; }

    get pageDownHandler() { return this._pageDownHandler; }
    set pageDownHandler(value) { this._pageDownHandler = typeof value === 'function' ? value : null; }

    get pageSize() { return this._pageSize; }
    set pageSize(value) { 
        this._pageSize = typeof value === 'number' && value > 0 ? value : 100;
        this._updateCurrentPage();
    }

    get totalPages() { return this._totalPages; }
    set totalPages(value) { 
        this._totalPages = typeof value === 'number' && value > 0 ? value : null;
        this._endReached = false; // Reset end flag when totalPages changes
    }

    get loading() { return this._loading; }
    set loading(value) { 
        this._loading = Boolean(value);
        this._updateLoadMoreSection();
    }

    get loadMoreCallback() { return this._loadMoreCallback; }
    set loadMoreCallback(value) { 
        this._loadMoreCallback = typeof value === 'function' ? value : null;
        this._updateLoadMoreSection();
    }

    get searchHandler() { return this._searchHandler; }
    set searchHandler(value) { this._searchHandler = typeof value === 'function' ? value : null; }

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
                this._bindSearchInput();
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
        this._bindSearchInput();
    }

    disconnectedCallback() {
        this._unbindSearchInput();
        this._unbindScrollListeners();
    }

    _bindSearchInput() {
        this._unbindSearchInput();
        
        if (this._searchInput) {
            const input = document.querySelector(this._searchInput);
            if (input) {
                this._searchInputListener = (e) => {
                    const query = e.target.value;
                    this._searchHandler?.(query);
                    this._dispatchEvent('search', { query });
                };
                input.addEventListener('input', this._searchInputListener);
            }
        }
    }

    _unbindSearchInput() {
        if (this._searchInputListener && this._searchInput) {
            const input = document.querySelector(this._searchInput);
            if (input) {
                input.removeEventListener('input', this._searchInputListener);
            }
        }
        this._searchInputListener = null;
    }

    _bindScrollListeners() {
        this._unbindScrollListeners();
        
        this._scrollContainer = this.shadowRoot.querySelector('.scroll-container');
        if (this._scrollContainer) {
            this._scrollContainer.addEventListener('scroll', this._onScroll);
        }
    }

    _unbindScrollListeners() {
        if (this._scrollContainer) {
            this._scrollContainer.removeEventListener('scroll', this._onScroll);
        }
        this._scrollContainer = null;
    }

    _handleScroll() {
        if (this._isScrolling) return;
        
        this._isScrolling = true;
        requestAnimationFrame(() => {
            // Get visible row indices using existing robust calculation
            let visibleStartIndex = 0;
            let visibleEndIndex = Math.max(0, this._rows.length - 1);
            
            const container = this._scrollContainer;
            if (this._layoutType === 'table') {
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
        this._currentPage = 1;
        this.render();
        this._dispatchEvent('data', { type: 'set', length: this._rows.length });
    }

    setPageData(data, pageNumber) {
        if (!Array.isArray(data)) return;
        
        if (pageNumber !== undefined && typeof pageNumber === 'number' && pageNumber >= 1) {
            // Replace specific page data
            const startIndex = (pageNumber - 1) * this._pageSize;
            
            // Fill gaps with empty objects instead of null to prevent render errors
            while (this._rows.length < startIndex) {
                this._rows.push({}); // Empty object instead of null
            }
            
            // Replace page data
            this._rows.splice(startIndex, this._pageSize, ...data);
            
            this.render();
            this._dispatchEvent('data', { type: 'page-set', pageNumber, length: this._rows.length });
        } else {
            // Append data as new page
            this._rows.push(...data);
            this._currentPage = Math.ceil(this._rows.length / this._pageSize);
            
            // Check if sorting is active - if so, we need to handle page boundaries carefully
            const activeSort = this._schema.find(col => col.sort);
            if (activeSort) {
                // Don't perform client-side sorting when pagination is active
                const isPaginationActive = this._totalPages !== null;
                if (isPaginationActive) {
                    console.warn('SwivelGrid: Client-side sorting disabled when pagination is active. New page data not sorted locally.');
                    this._renderAppendedRows(data);
                } else {
                    // Only sort when no pagination
                    this._sortData(activeSort.key, activeSort.sort, activeSort.sortComparator);
                    this.render();
                }
            } else {
                this._renderAppendedRows(data);
            }
            
            this._dispatchEvent('data', { type: 'page-append', length: this._rows.length });
        }
        
        // Reset loading and threshold flags
        this._loading = false;
        this._lastTriggeredPage = 0;
        this._updateCurrentPage();
    }

    appendData(rows) {
        if (!Array.isArray(rows) || rows.length === 0) return;
        
        this._rows.push(...rows);
        
        // If there's an active sort, check if we can re-sort
        const activeSort = this._schema.find(col => col.sort);
        if (activeSort) {
            // Don't perform client-side sorting when pagination is active
            const isPaginationActive = this._totalPages !== null;
            if (isPaginationActive) {
                console.warn('SwivelGrid: Client-side sorting disabled when pagination is active. Appended data not sorted locally.');
                this._renderAppendedRows(rows);
            } else {
                // Only sort when no pagination
                this._sortData(activeSort.key, activeSort.sort, activeSort.sortComparator);
                this.render();
            }
        } else {
            // Otherwise, just append the new rows
            this._renderAppendedRows(rows);
        }
        
        this._dispatchEvent('data', { type: 'append', added: rows.length, length: this._rows.length });
    }

    destroy() {
        this._unbindSearchInput();
        this._unbindScrollListeners();
    }

    render() {
        if (!this.shadowRoot) return;
        
        // Apply initial sorting if specified in schema
        const initialSort = this._schema.find(col => col.sort === 'ASC' || col.sort === 'DESC');
        if (initialSort && this._rows.length > 0) {
            // Clear other sort flags to ensure only one column is sorted
            this._schema.forEach(col => { if (col !== initialSort) col.sort = undefined; });
            
            // Only perform initial sort when pagination is not active
            const isPaginationActive = this._totalPages !== null;
            if (!isPaginationActive) {
                this._sortData(initialSort.key, initialSort.sort, initialSort.sortComparator);
            } else {
                console.warn('SwivelGrid: Initial client-side sorting disabled when pagination is active. Server should provide pre-sorted data.');
            }
        }
        
        this.shadowRoot.innerHTML = `
            <style>
                ${this._getStyles()}
            </style>
            <div class="scroll-container">
                ${this._renderLayout()}
                ${this._renderLoadMore()}
            </div>
        `;
        
        this._bindScrollListeners();
        this._attachSortListeners();
        this._bindLoadMoreEvents();
        this._updateCurrentPage();
    }

    _renderAppendedRows(newRows) {
        if (this._layoutType === 'table') {
            const tbody = this.shadowRoot.querySelector('tbody');
            if (tbody) {
                const fragment = document.createDocumentFragment();
                newRows.forEach((row) => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = this._renderTableRow(row);
                    fragment.appendChild(tr);
                });
                tbody.appendChild(fragment);
            }
        } else {
            const gridContainer = this.shadowRoot.querySelector('.grid-container');
            if (gridContainer) {
                const fragment = document.createDocumentFragment();
                newRows.forEach((row) => {
                    const card = document.createElement('div');
                    card.className = 'grid-card';
                    card.innerHTML = this._renderGridCard(row);
                    fragment.appendChild(card);
                });
                gridContainer.appendChild(fragment);
            }
        }
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
                --star-color: #fbbf24;
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

            .grid-image {
                width: 100%;
                max-height: 200px;
                object-fit: cover;
                border-radius: 4px;
                margin-bottom: 12px;
            }

            .grid-image-placeholder {
                width: 100%;
                height: 120px;
                background: #f6f8fa;
                border: 2px dashed #d1d9e0;
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #656d76;
                margin-bottom: 12px;
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

            .table-image {
                width: 40px;
                height: 40px;
                object-fit: cover;
                border-radius: 4px;
            }

            .table-image-placeholder {
                width: 40px;
                height: 40px;
                background: #f6f8fa;
                border: 1px dashed #d1d9e0;
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                color: #656d76;
            }

            /* Rating Styles */
            .rating {
                display: inline-flex;
                align-items: center;
                gap: 2px;
            }

            .rating-star {
                color: var(--star-color);
                font-size: 16px;
            }

            .rating-star.empty {
                color: #e1e5e9;
            }

            .rating-text {
                margin-left: 4px;
                font-size: 0.9em;
                color: #656d76;
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

            /* Template container styles */
            .template-content {
                display: contents;
            }

            /* Load more section styles */
            .load-more-section {
                padding: 20px;
                text-align: center;
                border-top: 1px solid var(--border-color);
                background: #f8f9fa;
            }

            .load-more-button {
                padding: 12px 24px;
                background: var(--primary-color);
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: background-color 0.2s;
            }

            .load-more-button:hover {
                background: #0056a3;
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
                border-top: 2px solid var(--primary-color);
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-right: 8px;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
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

        return this._layoutType === 'table' 
            ? this._renderTable()
            : this._renderGrid();
    }

    _renderEmptyState() {
        return `
            <div class="empty-state">
                <h3>No data available</h3>
                <p>Add schema and rows to display content.</p>
            </div>
        `;
    }

    _renderTable() {
        return `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            ${this._schema.map(col => `
                                <th class="${this._getSortClass(col)}" 
                                    data-key="${col.key}"
                                    style="${this._getColumnStyles(col)}"
                                    role="columnheader"
                                    scope="col"
                                    tabindex="${col.sortable === false ? '-1' : '0'}"
                                    aria-sort="${col.sort === 'ASC' ? 'ascending' : col.sort === 'DESC' ? 'descending' : 'none'}"
                                    aria-disabled="${col.sortable === false ? 'true' : 'false'}">
                                    ${this._renderHeaderContent(col)}
                                </th>
                            `).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${this._rows.map(row => `
                            <tr>
                                ${this._renderTableRow(row)}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    _renderTableRow(row) {
        return this._schema.map(col => `
            <td style="${this._getColumnStyles(col)}">
                ${this._renderCellContent(row[col.key], col, false, row)}
            </td>
        `).join('');
    }

    _renderGrid() {
        return `
            <div class="grid-container" role="list">
                ${this._rows.map(row => `
                    <div class="grid-card" role="listitem">
                        ${this._renderGridCard(row)}
                    </div>
                `).join('')}
            </div>
        `;
    }

    _renderGridCard(row) {
        const imageCol = this._schema.find(col => col.type === 'image');
        const otherCols = this._schema.filter(col => col.type !== 'image');
        
        let content = '';
        
        if (imageCol) {
            content += this._renderCellContent(row[imageCol.key], imageCol, true);
        }

        if (otherCols.length) {
            const primaryField = otherCols[0];
            const labelId = `label-${Math.random().toString(36).substr(2, 9)}`;
            
            content += `
                <section role="group" aria-labelledby="${labelId}">
                    ${otherCols.map((col, index) => `
                        <div class="grid-field">
                            <span class="grid-field-label" ${index === 0 ? `id="${labelId}"` : ''}>${this._renderHeaderContent(col, true)}:</span>
                            <span class="grid-field-value">${this._renderCellContent(row[col.key], col, false, row)}</span>
                        </div>
                    `).join('')}
                </section>
            `;
        }

        return content;
    }

    _renderCellContent(value, column, isGridImage = false, row = null) {
        // Handle null/empty rows from page gaps
        if (!row || typeof row !== 'object') {
            row = {};
        }
        
        // Optional: Use custom cell template if provided
        if (column.cellTemplate) {
            return this._renderTemplate(column.cellTemplate, {
                value,
                row,
                column,
                isGridImage
            });
        }

        // Default behavior: fallback to existing logic
        if (value === null || value === undefined) {
            const placeholder = '—';
            return column.cellClass ? 
                `<span class="${this._sanitizeClassName(column.cellClass)}">${placeholder}</span>` : 
                placeholder;
        }

        let content;
        switch (column.type) {
            case 'rating':
                content = this._renderRating(value);
                break;
            case 'image':
                content = this._renderImage(value, isGridImage);
                break;
            default:
                content = this._escapeHtml(String(value));
                break;
        }

        // Apply cellClass to default content (but not to special types like rating/image)
        if (column.cellClass && column.type !== 'rating' && column.type !== 'image') {
            return `<span class="${this._sanitizeClassName(column.cellClass)}">${content}</span>`;
        }
        
        return content;
    }

    _renderRating(value) {
        const rating = this._parseRating(value);
        if (!rating.isValid) {
            return '<span title="Invalid rating">—</span>';
        }

        const stars = [];
        for (let i = 1; i <= rating.max; i++) {
            const isFilled = i <= rating.value;
            stars.push(`<span class="rating-star ${isFilled ? '' : 'empty'}">★</span>`);
        }

        return `
            <div class="rating" aria-label="Rating: ${rating.value} out of ${rating.max}">
                ${stars.join('')}
                <span class="sr-only">Rating: ${rating.value} out of ${rating.max}</span>
            </div>
        `;
    }

    _renderImage(value, isGridImage = false) {
        const image = this._parseImage(value);
        const className = isGridImage ? 'grid-image' : 'table-image';
        const placeholderClass = isGridImage ? 'grid-image-placeholder' : 'table-image-placeholder';
        
        if (!image.src) {
            return `<div class="${placeholderClass}" title="No image">📷</div>`;
        }

        const id = `img-${Math.random().toString(36).slice(2)}`;
        queueMicrotask(() => {
            const img = this.shadowRoot?.getElementById(id);
            if (img) img.addEventListener('error', () => {
                img.outerHTML = `<div class="${placeholderClass}" title="Image failed to load">📷</div>`;
            }, { once: true });
        });
        return `<img id="${id}" class="${className}" src="${this._escapeHtml(image.src)}" alt="${this._escapeHtml(image.alt)}" />`;
    }

    _parseRating(value) {
        if (typeof value === 'object' && value !== null) {
            return {
                value: parseInt(value.value) || 0,
                max: parseInt(value.max) || 5,
                isValid: !isNaN(value.value)
            };
        }
        
        if (typeof value === 'string' && value.includes('/')) {
            const [val, max] = value.split('/').map(s => parseInt(s.trim()));
            return {
                value: val || 0,
                max: max || 5,
                isValid: !isNaN(val) && !isNaN(max)
            };
        }
        
        const numValue = parseInt(value);
        return {
            value: numValue || 0,
            max: 5,
            isValid: !isNaN(numValue)
        };
    }

    _parseImage(value) {
        if (typeof value === 'object' && value !== null) {
            return {
                src: value.src || '',
                alt: value.alt || 'Image'
            };
        }
        
        return {
            src: String(value || ''),
            alt: 'Image'
        };
    }

    _getSortClass(column) {
        const classes = [];
        if (column.sortable !== false) classes.push('sortable');
        if (column.sort === 'ASC') classes.push('sort-asc');
        if (column.sort === 'DESC') classes.push('sort-desc');
        return classes.join(' ');
    }

    _getColumnStyles(column) {
        const styles = [];
        if (column.minWidth) styles.push(`min-width: ${column.minWidth}`);
        if (column.maxWidth) styles.push(`max-width: ${column.maxWidth}`);
        return styles.join('; ');
    }

    _attachSortListeners() {
        const headers = this.shadowRoot.querySelectorAll('th[data-key]');
        headers.forEach(header => {
            const key = header.dataset.key;
            const col = this._schema.find(c => c.key === key);
            if (col?.sortable === false) return;
            
            header.addEventListener('click', (e) => {
                this._handleSort(e.currentTarget.dataset.key);
            });
            header.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this._handleSort(e.currentTarget.dataset.key);
                }
            });
        });
    }

    _handleSort(key) {
        const column = this._schema.find(col => col.key === key);
        if (!column) return;

        // Toggle sort direction
        const currentSort = column.sort;
        const newDirection = currentSort === 'ASC' ? 'DESC' : 'ASC';
        
        // Clear all other sorts and set new sort
        this._schema.forEach(col => {
            col.sort = col.key === key ? newDirection : undefined;
        });

        // Check if pagination is active (server-side data)
        const isPaginationActive = this._totalPages !== null;
        
        if (isPaginationActive) {
            // For server-side pagination, do NOT perform local sorting
            // This would break page boundaries and cause inconsistent data
            console.warn('SwivelGrid: Client-side sorting disabled when pagination is active. Sorting should be handled server-side via sortHandler.');
        } else {
            // Reset paging when sorting (only for client-side data)
            this._currentPage = 1;
            this._lastTriggeredPage = 0;
            this._endReached = false;
            
            // Sort the data (client-side only)
            this._sortData(key, newDirection, column.sortComparator);
        }

        // Trigger handlers and events
        this._sortHandler?.({ key, direction: newDirection });
        this._dispatchEvent('sort', { key, direction: newDirection });

        // Re-render to show new sort indicators
        this.render();
    }

    _sortData(key, direction, customComparator) {
        this._rows.sort((a, b) => {
            const aVal = a[key];
            const bVal = b[key];

            let result;
            if (customComparator) {
                result = customComparator(aVal, bVal, a, b);
            } else {
                result = this._defaultSort(aVal, bVal, key);
            }

            return direction === 'DESC' ? -result : result;
        });
    }

    _defaultSort(a, b, key) {
        const column = this._schema.find(col => col.key === key);
        const type = column?.type || 'text';

        if (type === 'rating') {
            const aRating = this._parseRating(a);
            const bRating = this._parseRating(b);
            const aRatio = aRating.isValid ? aRating.value / aRating.max : 0;
            const bRatio = bRating.isValid ? bRating.value / bRating.max : 0;
            return aRatio - bRatio;
        }

        if (type === 'image') {
            const aImg = this._parseImage(a);
            const bImg = this._parseImage(b);
            return aImg.src.localeCompare(bImg.src);
        }

        // Default text/numeric comparison
        if (typeof a === 'number' && typeof b === 'number') {
            return a - b;
        }

        return String(a || '').localeCompare(String(b || ''));
    }

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    _renderHeaderContent(column, isGridLabel = false) {
        // Optional: Use custom header template if provided
        if (column.headerTemplate) {
            return this._renderTemplate(column.headerTemplate, {
                column,
                label: column.label,
                isGridLabel
            });
        }

        // Default behavior with optional class application
        const label = this._escapeHtml(column.label);
        if (column.headerClass) {
            return `<span class="${this._sanitizeClassName(column.headerClass)}">${label}</span>`;
        }
        
        return label;
    }

    _renderTemplate(template, context) {
        if (typeof template !== 'string') {
            console.warn('Template must be a string, falling back to default rendering');
            return context.value ? this._escapeHtml(String(context.value)) : '';
        }

        try {
            // Simple template interpolation with context variables
            return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, expression) => {
                const keys = expression.trim().split('.');
                let value = context;
                
                // Navigate nested object properties
                for (const key of keys) {
                    if (value && typeof value === 'object' && key in value) {
                        value = value[key];
                    } else {
                        return match; // Keep original if property not found
                    }
                }
                
                // Return escaped HTML for security
                return value !== null && value !== undefined ? this._escapeHtml(String(value)) : '';
            });
        } catch (error) {
            console.error('Template rendering error:', error);
            // Fallback to default rendering on error
            return context.value ? this._escapeHtml(String(context.value)) : '';
        }
    }

    _sanitizeTemplate(template) {
        if (typeof template !== 'string') return null;
        
        // Basic template validation - only allow simple interpolation
        // This prevents script injection while allowing HTML structure
        const dangerousPatterns = [
            /<script[^>]*>/gi,
            /javascript:/gi,
            /vbscript:/gi,
            /data:/gi,
            /on\w+\s*=/gi,
            /<iframe[^>]*>/gi,
            /<object[^>]*>/gi,
            /<embed[^>]*>/gi
        ];
        
        for (const pattern of dangerousPatterns) {
            if (pattern.test(template)) {
                console.warn('Template contains potentially dangerous content, sanitizing');
                return template.replace(pattern, '');
            }
        }
        
        return template;
    }

    _sanitizeClassName(s) {
        return typeof s === 'string' ? s.split(/\s+/).map(t => t.replace(/[^\w-]/g, '')).join(' ') : '';
    }

    _updateCurrentPage() {
        if (this._rows.length === 0) {
            this._currentPage = 1;
        } else {
            this._currentPage = Math.ceil(this._rows.length / this._pageSize);
        }
        this._updateLoadMoreSection();
    }

    _updateLoadMoreSection() {
        const loadMoreSection = this.shadowRoot?.querySelector('.load-more-section');
        if (loadMoreSection) {
            loadMoreSection.innerHTML = this._getLoadMoreContent();
            this._bindLoadMoreEvents();
        }
    }

    _renderLoadMore() {
        // Only show load more section if totalPages is set and we haven't reached the end
        if (this._totalPages && this._currentPage < this._totalPages) {
            return `<div class="load-more-section">${this._getLoadMoreContent()}</div>`;
        }
        return '';
    }

    _getLoadMoreContent() {
        if (this._loading) {
            return '<div class="spinner"></div>Loading more...';
        }
        
        if (this._loadMoreCallback) {
            return '<button class="load-more-button" id="load-more-btn">Load More</button>';
        }
        
        return '<div style="color: #6c757d;">Scroll to load more content</div>';
    }

    _bindLoadMoreEvents() {
        const loadMoreBtn = this.shadowRoot?.getElementById('load-more-btn');
        if (loadMoreBtn && this._loadMoreCallback) {
            loadMoreBtn.addEventListener('click', () => {
                this._loadMoreCallback();
            });
        }
    }

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
        const pageEndIndex = Math.min(pageStartIndex + this._pageSize, this._rows.length);
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

    _processSchema(schema) {
        if (!Array.isArray(schema)) return [];
        
        return schema.map(col => {
            const processedCol = { ...col };
            
            // Sanitize templates if provided
            if (processedCol.headerTemplate) {
                processedCol.headerTemplate = this._sanitizeTemplate(processedCol.headerTemplate);
            }
            if (processedCol.cellTemplate) {
                processedCol.cellTemplate = this._sanitizeTemplate(processedCol.cellTemplate);
            }
            
            return processedCol;
        });
    }
}

customElements.define('swivel-grid', SwivelGrid);