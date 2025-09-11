/**
 * ColumnTypesExtension for SwivelGrid
 * Handles special column types: rating, image, and text with cell templates
 * Extracted from core SwivelGrid to support modular architecture
 */
class ColumnTypesExtension extends BaseExtension {
    constructor() {
        super('column-types');
        this.priority = 20; // Should load after layout renderer
    }

    onInitialize(gridInstance) {
        this.grid = gridInstance;
        this.addColumnTypesStyles();
    }

    onDestroy() {
        this.removeColumnTypesStyles();
    }

    /**
     * Render cell content based on column type
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
        
        // Optional: Use custom cell template if provided
        if (column.cellTemplate) {
            return this.renderTemplate(column.cellTemplate, {
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
                `<span class="${this.sanitizeClassName(column.cellClass)}">${placeholder}</span>` : 
                placeholder;
        }

        let content;
        switch (column.type) {
            case 'rating':
                content = this.renderRating(value);
                break;
            case 'image':
                content = this.renderImage(value, isGridImage);
                break;
            default:
                content = this.escapeHtml(String(value));
                break;
        }

        // Apply cellClass to default content (but not to special types like rating/image)
        if (column.cellClass && column.type !== 'rating' && column.type !== 'image') {
            return `<span class="${this.sanitizeClassName(column.cellClass)}">${content}</span>`;
        }

        return content;
    }

    /**
     * Render rating display with stars
     * @param {*} value - Rating value (number, string, or object)
     * @returns {string} Rating HTML
     */
    renderRating(value) {
        const rating = this.parseRating(value);
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

    /**
     * Render image with proper sizing and error handling
     * @param {*} value - Image value (string URL or object with src/alt)
     * @param {boolean} isGridImage - Whether this is for grid layout
     * @returns {string} Image HTML
     */
    renderImage(value, isGridImage = false) {
        const image = this.parseImage(value);
        const className = isGridImage ? 'grid-image' : 'table-image';
        const placeholderClass = isGridImage ? 'grid-image-placeholder' : 'table-image-placeholder';
        
        if (!image.src) {
            return `<div class="${placeholderClass}" title="No image">📷</div>`;
        }

        const id = `img-${Math.random().toString(36).slice(2)}`;
        
        // Use queueMicrotask to add error handling after DOM insertion
        queueMicrotask(() => {
            const grid = this.getGrid();
            const shadowRoot = grid?.shadowRoot;
            const img = shadowRoot?.getElementById(id);
            if (img) {
                img.addEventListener('error', () => {
                    img.outerHTML = `<div class="${placeholderClass}" title="Image failed to load">📷</div>`;
                }, { once: true });
            }
        });
        
        return `<img id="${id}" class="${className}" src="${this.escapeHtml(image.src)}" alt="${this.escapeHtml(image.alt)}" />`;
    }

    /**
     * Parse rating value into structured format
     * @param {*} value - Rating value
     * @returns {Object} Parsed rating with value, max, and isValid
     */
    parseRating(value) {
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

    /**
     * Parse image value into structured format
     * @param {*} value - Image value
     * @returns {Object} Parsed image with src and alt
     */
    parseImage(value) {
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

    /**
     * Render template with context (uses TemplateExtension if available)
     * @param {string} template - Template string
     * @param {Object} context - Template context
     * @returns {string} Rendered template
     */
    renderTemplate(template, context) {
        // Try to use TemplateExtension first
        const grid = this.getGrid();
        const templateExtension = grid?.getExtension('templates');
        if (templateExtension && templateExtension.enabled) {
            return templateExtension.renderCellTemplate(
                template, 
                context.value, 
                context.column, 
                context.row, 
                context.isGridImage
            );
        }
        
        // Fallback to grid's implementation if available
        if (this.grid && this.grid._renderTemplate) {
            return this.grid._renderTemplate(template, context);
        }
        
        // Basic fallback
        return String(context.value || '');
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
     * Sanitize CSS class names
     * @param {string} className - Class name to sanitize
     * @returns {string} Sanitized class name
     */
    sanitizeClassName(className) {
        // For now, delegate to grid's implementation if available
        if (this.grid && this.grid._sanitizeClassName) {
            return this.grid._sanitizeClassName(className);
        }
        
        // Basic fallback
        return String(className || '').replace(/[^a-zA-Z0-9_-]/g, '');
    }

    /**
     * Add CSS styles for column types to the grid
     */
    addColumnTypesStyles() {
        const css = `
            /* Rating styles */
            .rating {
                display: inline-flex;
                align-items: center;
                gap: 2px;
            }

            .rating-star {
                color: var(--star-color, #ffc107);
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

            /* Image styles for grid layout */
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
                font-size: 24px;
            }

            /* Image styles for table layout */
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
        `;

        const grid = this.getGrid();
        if (grid && grid.addExtensionStyles) {
            grid.addExtensionStyles(css, 'column-types');
        }
    }

    /**
     * Remove column types styles from the grid
     */
    removeColumnTypesStyles() {
        const grid = this.getGrid();
        if (grid && grid.removeExtensionStyles) {
            grid.removeExtensionStyles('column-types');
        }
    }

    /**
     * Handle sorting for special column types
     * @param {*} a - First value
     * @param {*} b - Second value
     * @param {string} columnType - Column type
     * @returns {number} Sort comparison result
     */
    compareColumnValues(a, b, columnType) {
        switch (columnType) {
            case 'rating': {
                const aRating = this.parseRating(a);
                const bRating = this.parseRating(b);
                return aRating.value - bRating.value;
            }
            case 'image': {
                const aImg = this.parseImage(a);
                const bImg = this.parseImage(b);
                return aImg.alt.localeCompare(bImg.alt);
            }
            default:
                return String(a || '').localeCompare(String(b || ''));
        }
    }
}

// Export for use in both ES modules and browser globals
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ColumnTypesExtension;
} else if (typeof window !== 'undefined') {
    window.ColumnTypesExtension = ColumnTypesExtension;
}