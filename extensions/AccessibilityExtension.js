/**
 * AccessibilityExtension for SwivelGrid
 * Handles ARIA labels, keyboard navigation, screen reader support, and semantic HTML
 * Extracted from core SwivelGrid to support modular architecture
 */
class AccessibilityExtension extends BaseExtension {
    constructor() {
        super('accessibility');
        this.priority = 25; // Should load after layout renderers but before final rendering
    }

    onInitialize(gridInstance) {
        this.grid = gridInstance;
        this.addAccessibilityStyles();
        
        // Accessibility state
        this._focusedCell = null;
        this._focusedRow = null;
        this._focusedColumn = null;
    }

    onDestroy() {
        this.removeAccessibilityStyles();
        this._unbindKeyboardListeners();
    }

    onAfterRender(context) {
        // Set up keyboard navigation after rendering
        this._bindKeyboardListeners();
        
        // Ensure proper focus management
        this._setupFocusManagement();
        
        return context;
    }

    onBeforeRender(context) {
        // Add accessibility context to rendering
        context.accessibility = {
            enableKeyboardNavigation: true,
            enableScreenReaderSupport: true,
            generateARIALabels: true
        };
        
        return context;
    }

    /**
     * Generate ARIA attributes for table headers
     * @param {Object} column - Column configuration
     * @returns {string} ARIA attributes string
     */
    generateHeaderARIA(column) {
        const attributes = [];
        
        // Basic semantic attributes
        attributes.push('role="columnheader"');
        attributes.push('scope="col"');
        
        // Sortability attributes
        if (column.sortable !== false) {
            attributes.push('tabindex="0"');
            attributes.push(`aria-sort="${this._getSortARIAValue(column.sort)}"`);
            attributes.push('aria-disabled="false"');
        } else {
            attributes.push('tabindex="-1"');
            attributes.push('aria-sort="none"');
            attributes.push('aria-disabled="true"');
        }
        
        // Add description for screen readers
        if (column.sortable !== false) {
            const sortInstruction = this._getSortInstruction(column.sort);
            attributes.push(`aria-label="${this._escapeAttribute(column.label || column.key)} ${sortInstruction}"`);
        } else {
            attributes.push(`aria-label="${this._escapeAttribute(column.label || column.key)} (not sortable)"`);
        }
        
        return attributes.join(' ');
    }

    /**
     * Generate ARIA attributes for grid containers
     * @param {string} layoutType - Layout type (table or grid)
     * @returns {Object} ARIA attributes for containers
     */
    generateContainerARIA(layoutType) {
        if (layoutType === 'grid') {
            return {
                container: 'role="list" aria-label="Data grid"',
                item: 'role="listitem"',
                group: 'role="group"'
            };
        }
        
        return {
            container: 'role="table" aria-label="Data table"',
            item: '',
            group: ''
        };
    }

    /**
     * Generate unique IDs for ARIA relationships
     * @param {string} prefix - ID prefix
     * @returns {string} Unique ID
     */
    generateARIAId(prefix = 'aria') {
        return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Generate screen reader only content
     * @param {string} text - Text for screen readers
     * @returns {string} Screen reader only HTML
     */
    generateScreenReaderContent(text) {
        return `<span class="sr-only">${this._escapeHTML(text)}</span>`;
    }

    /**
     * Generate live region for dynamic content updates
     * @param {string} content - Content to announce
     * @param {string} priority - Priority level (polite, assertive)
     * @returns {string} Live region HTML
     */
    generateLiveRegion(content, priority = 'polite') {
        return `<div aria-live="${priority}" aria-atomic="true" class="sr-only">${this._escapeHTML(content)}</div>`;
    }

    /**
     * Generate keyboard navigation instructions
     * @returns {string} Keyboard instructions HTML
     */
    generateKeyboardInstructions() {
        return this.generateScreenReaderContent(
            'Use arrow keys to navigate, Enter or Space to sort columns, Tab to move between interactive elements'
        );
    }

    /**
     * Handle keyboard navigation
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleKeyboardNavigation(event) {
        const { key, target, ctrlKey, shiftKey } = event;
        
        // Handle sortable headers
        if (target.matches('th[role="columnheader"]')) {
            switch (key) {
                case 'Enter':
                case ' ':
                    event.preventDefault();
                    this._handleSort(target);
                    break;
                case 'ArrowRight':
                    event.preventDefault();
                    this._focusNextHeader(target);
                    break;
                case 'ArrowLeft':
                    event.preventDefault();
                    this._focusPreviousHeader(target);
                    break;
                case 'Home':
                    if (ctrlKey) {
                        event.preventDefault();
                        this._focusFirstHeader();
                    }
                    break;
                case 'End':
                    if (ctrlKey) {
                        event.preventDefault();
                        this._focusLastHeader();
                    }
                    break;
            }
            return;
        }
        
        // Handle table cell navigation
        if (target.matches('td')) {
            this._handleCellNavigation(event);
            return;
        }
        
        // Handle grid card navigation
        if (target.matches('.grid-card, .grid-card *')) {
            this._handleGridNavigation(event);
            return;
        }
    }

    /**
     * Set up focus management for the grid
     */
    _setupFocusManagement() {
        const grid = this.getGrid();
        const shadowRoot = grid.shadowRoot;
        
        if (!shadowRoot) return;
        
        // Set up roving tabindex for headers
        this._setupHeaderFocusManagement(shadowRoot);
        
        // Set up cell focus management for table layout
        this._setupCellFocusManagement(shadowRoot);
        
        // Set up grid card focus management
        this._setupGridFocusManagement(shadowRoot);
    }

    /**
     * Set up header focus management with roving tabindex
     * @param {ShadowRoot} shadowRoot - Grid shadow root
     */
    _setupHeaderFocusManagement(shadowRoot) {
        const headers = shadowRoot.querySelectorAll('th[role="columnheader"]:not([aria-disabled="true"])');
        
        if (headers.length === 0) return;
        
        // Set first header as focusable
        headers.forEach((header, index) => {
            header.tabIndex = index === 0 ? 0 : -1;
        });
    }

    /**
     * Set up cell focus management for table layout
     * @param {ShadowRoot} shadowRoot - Grid shadow root
     */
    _setupCellFocusManagement(shadowRoot) {
        const cells = shadowRoot.querySelectorAll('tbody td');
        
        cells.forEach(cell => {
            // Make cells focusable for keyboard navigation
            if (!cell.hasAttribute('tabindex')) {
                cell.tabIndex = -1;
            }
        });
    }

    /**
     * Set up grid card focus management
     * @param {ShadowRoot} shadowRoot - Grid shadow root
     */
    _setupGridFocusManagement(shadowRoot) {
        const cards = shadowRoot.querySelectorAll('.grid-card');
        
        cards.forEach((card, index) => {
            // Make cards focusable
            card.tabIndex = index === 0 ? 0 : -1;
            
            // Add card index for screen readers
            const cardLabel = `Card ${index + 1} of ${cards.length}`;
            card.setAttribute('aria-label', cardLabel);
        });
    }

    /**
     * Bind keyboard event listeners
     */
    _bindKeyboardListeners() {
        const grid = this.getGrid();
        const shadowRoot = grid.shadowRoot;
        
        if (!shadowRoot) return;
        
        // Bind keydown listener to the entire grid
        shadowRoot.addEventListener('keydown', this.handleKeyboardNavigation.bind(this));
        
        // Bind focus events for roving tabindex
        shadowRoot.addEventListener('focus', this._handleFocusIn.bind(this), true);
    }

    /**
     * Unbind keyboard event listeners
     */
    _unbindKeyboardListeners() {
        const grid = this.getGrid();
        const shadowRoot = grid?.shadowRoot;
        
        if (!shadowRoot) return;
        
        shadowRoot.removeEventListener('keydown', this.handleKeyboardNavigation.bind(this));
        shadowRoot.removeEventListener('focus', this._handleFocusIn.bind(this), true);
    }

    /**
     * Handle focus events for roving tabindex
     * @param {FocusEvent} event - Focus event
     */
    _handleFocusIn(event) {
        const { target } = event;
        
        // Handle header focus
        if (target.matches('th[role="columnheader"]')) {
            this._updateHeaderTabIndex(target);
        }
        
        // Handle cell focus
        if (target.matches('td')) {
            this._focusedCell = target;
            this._updateCellARIA(target);
        }
        
        // Handle grid card focus
        if (target.matches('.grid-card')) {
            this._updateGridCardTabIndex(target);
        }
    }

    /**
     * Update header tabindex for roving tabindex
     * @param {HTMLElement} focusedHeader - Currently focused header
     */
    _updateHeaderTabIndex(focusedHeader) {
        const grid = this.getGrid();
        const shadowRoot = grid.shadowRoot;
        const headers = shadowRoot.querySelectorAll('th[role="columnheader"]');
        
        headers.forEach(header => {
            header.tabIndex = header === focusedHeader ? 0 : -1;
        });
    }

    /**
     * Update cell ARIA attributes when focused
     * @param {HTMLElement} cell - Focused cell
     */
    _updateCellARIA(cell) {
        const rowIndex = Array.from(cell.parentElement.parentElement.children).indexOf(cell.parentElement);
        const colIndex = Array.from(cell.parentElement.children).indexOf(cell);
        
        // Announce cell position to screen readers
        const announcement = `Row ${rowIndex + 1}, Column ${colIndex + 1}`;
        this._announceToScreenReader(announcement);
    }

    /**
     * Update grid card tabindex for roving tabindex
     * @param {HTMLElement} focusedCard - Currently focused card
     */
    _updateGridCardTabIndex(focusedCard) {
        const grid = this.getGrid();
        const shadowRoot = grid.shadowRoot;
        const cards = shadowRoot.querySelectorAll('.grid-card');
        
        cards.forEach(card => {
            card.tabIndex = card === focusedCard ? 0 : -1;
        });
    }

    /**
     * Handle sort action from keyboard or mouse
     * @param {HTMLElement} header - Header element
     */
    _handleSort(header) {
        const key = header.dataset.key;
        if (!key || header.getAttribute('aria-disabled') === 'true') return;
        
        const grid = this.getGrid();
        const sortingExtension = grid.getExtension('sorting');
        
        if (sortingExtension && sortingExtension.enabled) {
            sortingExtension.handleSort(key);
        } else if (grid._handleSort) {
            grid._handleSort(key);
        }
        
        // Announce sort change to screen readers
        const column = grid._schema.find(col => col.key === key);
        if (column) {
            const sortDirection = column.sort === 'ASC' ? 'ascending' : 
                                 column.sort === 'DESC' ? 'descending' : 'unsorted';
            this._announceToScreenReader(`Column ${column.label || key} sorted ${sortDirection}`);
        }
    }

    /**
     * Focus next header
     * @param {HTMLElement} currentHeader - Current header
     */
    _focusNextHeader(currentHeader) {
        const headers = this._getFocusableHeaders();
        const currentIndex = headers.indexOf(currentHeader);
        const nextIndex = (currentIndex + 1) % headers.length;
        headers[nextIndex].focus();
    }

    /**
     * Focus previous header
     * @param {HTMLElement} currentHeader - Current header
     */
    _focusPreviousHeader(currentHeader) {
        const headers = this._getFocusableHeaders();
        const currentIndex = headers.indexOf(currentHeader);
        const prevIndex = currentIndex === 0 ? headers.length - 1 : currentIndex - 1;
        headers[prevIndex].focus();
    }

    /**
     * Focus first header
     */
    _focusFirstHeader() {
        const headers = this._getFocusableHeaders();
        if (headers.length > 0) {
            headers[0].focus();
        }
    }

    /**
     * Focus last header
     */
    _focusLastHeader() {
        const headers = this._getFocusableHeaders();
        if (headers.length > 0) {
            headers[headers.length - 1].focus();
        }
    }

    /**
     * Get focusable headers
     * @returns {HTMLElement[]} Focusable headers
     */
    _getFocusableHeaders() {
        const grid = this.getGrid();
        const shadowRoot = grid.shadowRoot;
        return Array.from(shadowRoot.querySelectorAll('th[role="columnheader"]:not([aria-disabled="true"])'));
    }

    /**
     * Handle cell navigation in table layout
     * @param {KeyboardEvent} event - Keyboard event
     */
    _handleCellNavigation(event) {
        const { key, target } = event;
        
        switch (key) {
            case 'ArrowRight':
                event.preventDefault();
                this._focusNextCell(target);
                break;
            case 'ArrowLeft':
                event.preventDefault();
                this._focusPreviousCell(target);
                break;
            case 'ArrowDown':
                event.preventDefault();
                this._focusCellBelow(target);
                break;
            case 'ArrowUp':
                event.preventDefault();
                this._focusCellAbove(target);
                break;
        }
    }

    /**
     * Handle grid navigation
     * @param {KeyboardEvent} event - Keyboard event
     */
    _handleGridNavigation(event) {
        const { key, target } = event;
        const card = target.closest('.grid-card');
        
        if (!card) return;
        
        switch (key) {
            case 'ArrowDown':
                event.preventDefault();
                this._focusNextCard(card);
                break;
            case 'ArrowUp':
                event.preventDefault();
                this._focusPreviousCard(card);
                break;
        }
    }

    /**
     * Focus next cell in table
     * @param {HTMLElement} currentCell - Current cell
     */
    _focusNextCell(currentCell) {
        const nextCell = currentCell.nextElementSibling;
        if (nextCell) {
            nextCell.focus();
        }
    }

    /**
     * Focus previous cell in table
     * @param {HTMLElement} currentCell - Current cell
     */
    _focusPreviousCell(currentCell) {
        const prevCell = currentCell.previousElementSibling;
        if (prevCell) {
            prevCell.focus();
        }
    }

    /**
     * Focus cell below in table
     * @param {HTMLElement} currentCell - Current cell
     */
    _focusCellBelow(currentCell) {
        const cellIndex = Array.from(currentCell.parentElement.children).indexOf(currentCell);
        const nextRow = currentCell.parentElement.nextElementSibling;
        if (nextRow) {
            const targetCell = nextRow.children[cellIndex];
            if (targetCell) {
                targetCell.focus();
            }
        }
    }

    /**
     * Focus cell above in table
     * @param {HTMLElement} currentCell - Current cell
     */
    _focusCellAbove(currentCell) {
        const cellIndex = Array.from(currentCell.parentElement.children).indexOf(currentCell);
        const prevRow = currentCell.parentElement.previousElementSibling;
        if (prevRow) {
            const targetCell = prevRow.children[cellIndex];
            if (targetCell) {
                targetCell.focus();
            }
        }
    }

    /**
     * Focus next card in grid layout
     * @param {HTMLElement} currentCard - Current card
     */
    _focusNextCard(currentCard) {
        const nextCard = currentCard.nextElementSibling;
        if (nextCard) {
            nextCard.focus();
        }
    }

    /**
     * Focus previous card in grid layout
     * @param {HTMLElement} currentCard - Current card
     */
    _focusPreviousCard(currentCard) {
        const prevCard = currentCard.previousElementSibling;
        if (prevCard) {
            prevCard.focus();
        }
    }

    /**
     * Announce message to screen readers
     * @param {string} message - Message to announce
     */
    _announceToScreenReader(message) {
        const grid = this.getGrid();
        const shadowRoot = grid.shadowRoot;
        
        // Create or update live region
        let liveRegion = shadowRoot.querySelector('#accessibility-live-region');
        if (!liveRegion) {
            liveRegion = document.createElement('div');
            liveRegion.id = 'accessibility-live-region';
            liveRegion.setAttribute('aria-live', 'polite');
            liveRegion.setAttribute('aria-atomic', 'true');
            liveRegion.className = 'sr-only';
            shadowRoot.appendChild(liveRegion);
        }
        
        // Clear and set new message
        liveRegion.textContent = '';
        setTimeout(() => {
            liveRegion.textContent = message;
        }, 100);
    }

    /**
     * Get ARIA value for sort state
     * @param {string} sort - Sort direction
     * @returns {string} ARIA sort value
     */
    _getSortARIAValue(sort) {
        switch (sort) {
            case 'ASC': return 'ascending';
            case 'DESC': return 'descending';
            default: return 'none';
        }
    }

    /**
     * Get sort instruction for screen readers
     * @param {string} sort - Current sort direction
     * @returns {string} Sort instruction
     */
    _getSortInstruction(sort) {
        switch (sort) {
            case 'ASC': return '(sorted ascending, activate to sort descending)';
            case 'DESC': return '(sorted descending, activate to remove sorting)';
            default: return '(activate to sort ascending)';
        }
    }

    /**
     * Escape HTML content for safe insertion
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    _escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Escape attribute values
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    _escapeAttribute(text) {
        return String(text || '').replace(/[&<>"']/g, (match) => {
            const escapeChars = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
            return escapeChars[match];
        });
    }

    /**
     * Add accessibility CSS styles
     */
    addAccessibilityStyles() {
        const css = `
            /* Screen reader only content */
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
            
            /* Focus styles */
            th[role="columnheader"]:focus {
                outline: 2px solid var(--focus-color, #0969da);
                outline-offset: 2px;
                background-color: var(--focus-bg, rgba(9, 105, 218, 0.1));
            }
            
            td:focus {
                outline: 2px solid var(--focus-color, #0969da);
                outline-offset: -2px;
                background-color: var(--focus-bg, rgba(9, 105, 218, 0.1));
            }
            
            .grid-card:focus {
                outline: 2px solid var(--focus-color, #0969da);
                outline-offset: 2px;
                background-color: var(--focus-bg, rgba(9, 105, 218, 0.1));
            }
            
            /* Disabled state styles */
            th[aria-disabled="true"] {
                opacity: 0.6;
                cursor: not-allowed;
            }
            
            th[aria-disabled="true"]:hover {
                background-color: transparent;
            }
            
            /* High contrast mode support */
            @media (prefers-contrast: high) {
                th[role="columnheader"]:focus,
                td:focus,
                .grid-card:focus {
                    outline: 3px solid;
                    outline-offset: 2px;
                }
            }
            
            /* Reduced motion support */
            @media (prefers-reduced-motion: reduce) {
                * {
                    animation-duration: 0.01ms !important;
                    animation-iteration-count: 1 !important;
                    transition-duration: 0.01ms !important;
                }
            }
        `;
        
        const grid = this.getGrid();
        if (grid && grid.addExtensionStyles) {
            grid.addExtensionStyles(css, 'accessibility');
        }
    }

    /**
     * Remove accessibility styles
     */
    removeAccessibilityStyles() {
        const grid = this.getGrid();
        if (grid && grid.removeExtensionStyles) {
            grid.removeExtensionStyles('accessibility');
        }
    }

    /**
     * Get accessibility configuration
     * @returns {Object} Accessibility configuration
     */
    getAccessibilityConfig() {
        return {
            keyboardNavigation: true,
            screenReaderSupport: true,
            ariaLabels: true,
            focusManagement: true,
            highContrast: true,
            reducedMotion: true
        };
    }
}

// Export for use in both ES modules and browser globals
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AccessibilityExtension;
} else if (typeof window !== 'undefined') {
    window.AccessibilityExtension = AccessibilityExtension;
}