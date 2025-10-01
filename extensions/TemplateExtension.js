/**
 * TemplateExtension for SwivelGrid
 * Handles cell and header template rendering with XSS protection
 * Extracted from core SwivelGrid to support modular architecture
 */
class TemplateExtension extends BaseExtension {
    constructor() {
        super('templates');
        this.priority = 15; // Should load after layout renderer but before column types
    }

    onInitialize(gridInstance) {
        this.grid = gridInstance;
        this.addTemplateStyles();
    }

    onDestroy() {
        this.removeTemplateStyles();
    }

    /**
     * Render a template with the given context
     * @param {string} template - Template string with {{variable}} placeholders
     * @param {Object} context - Context object with template variables
     * @returns {string} Rendered template HTML
     */
    renderTemplate(template, context) {
        if (typeof template !== 'string') {
            console.warn('Template must be a string, falling back to default rendering');
            return context.value ? this.escapeHtml(String(context.value)) : '';
        }

        try {
            // Enhanced template interpolation with helper function support
            return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, expression) => {
                const expr = expression.trim();
                
                // Check for helper function calls (e.g., "renderText id", "formatCurrency price")
                const functionMatch = expr.match(/^(\w+)\s+(.+)$/);
                if (functionMatch) {
                    const [, functionName, argExpr] = functionMatch;
                    
                    // Check if it's a known helper function
                    if (typeof this[functionName] === 'function') {
                        // Get the argument value from context
                        const argValue = this.getValueFromContext(context, argExpr);
                        
                        // Call the helper function
                        try {
                            return this[functionName](argValue);
                        } catch (error) {
                            console.warn(`Error calling ${functionName}:`, error);
                            return this.escapeHtml(String(argValue || ''));
                        }
                    }
                }
                
                // Handle simple property access (e.g., "value", "row.name")
                const value = this.getValueFromContext(context, expr);
                return value !== null && value !== undefined ? this.escapeHtml(String(value)) : '';
            });
        } catch (error) {
            console.error('Template rendering error:', error);
            // Fallback to default rendering on error
            return context.value ? this.escapeHtml(String(context.value)) : '';
        }
    }

    /**
     * Get value from context using dot notation
     * @param {Object} context - Template context
     * @param {string} path - Property path (e.g., "value", "row.name")
     * @returns {*} Value from context
     */
    getValueFromContext(context, path) {
        const keys = path.split('.');
        let value = context;
        
        // Navigate nested object properties
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return undefined;
            }
        }
        
        return value;
    }

    /**
     * Sanitize template to prevent XSS attacks
     * @param {string} template - Template string to sanitize
     * @returns {string|null} Sanitized template or null if invalid
     */
    sanitizeTemplate(template) {
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
            /<embed[^>]*>/gi,
            /<form[^>]*>/gi,
            /<input[^>]*>/gi,
            /<textarea[^>]*>/gi,
            /<select[^>]*>/gi
        ];
        
        let sanitized = template;
        for (const pattern of dangerousPatterns) {
            if (pattern.test(sanitized)) {
                console.warn('Template contains potentially dangerous content, sanitizing');
                sanitized = sanitized.replace(pattern, '');
            }
        }
        
        return sanitized;
    }

    /**
     * Validate template syntax and structure
     * @param {string} template - Template string to validate
     * @returns {Object} Validation result with isValid and errors
     */
    validateTemplate(template) {
        const result = {
            isValid: true,
            errors: [],
            warnings: []
        };

        if (typeof template !== 'string') {
            result.isValid = false;
            result.errors.push('Template must be a string');
            return result;
        }

        // Check for unmatched braces
        const openBraces = (template.match(/\{\{/g) || []).length;
        const closeBraces = (template.match(/\}\}/g) || []).length;
        if (openBraces !== closeBraces) {
            result.isValid = false;
            result.errors.push('Unmatched template braces');
        }

        // Check for nested template expressions
        const nestedPattern = /\{\{[^}]*\{\{/g;
        if (nestedPattern.test(template)) {
            result.isValid = false;
            result.errors.push('Nested template expressions are not supported');
        }

        // Check for potentially dangerous content
        const dangerousPatterns = [
            { pattern: /<script/gi, message: 'Script tags are not allowed' },
            { pattern: /javascript:/gi, message: 'JavaScript URLs are not allowed' },
            { pattern: /on\w+\s*=/gi, message: 'Event handlers are not allowed' },
            { pattern: /<iframe/gi, message: 'Iframe tags are not allowed' }
        ];

        for (const { pattern, message } of dangerousPatterns) {
            if (pattern.test(template)) {
                result.warnings.push(message);
            }
        }

        return result;
    }

    /**
     * Render cell template with context
     * @param {string} template - Cell template
     * @param {*} value - Cell value
     * @param {Object} column - Column configuration
     * @param {Object} row - Row data
     * @param {boolean} isGridImage - Whether this is a grid image
     * @returns {string} Rendered cell HTML
     */
    renderCellTemplate(template, value, column, row, isGridImage = false) {
        const context = {
            value,
            row,
            column,
            isGridImage,
            // Make row properties available at top level for easy template access
            ...row,
            // Helper functions available in templates
            helpers: {
                renderText: this.renderText,
                formatDate: this.formatDate,
                formatNumber: this.formatNumber,
                formatCurrency: this.formatCurrency,
                capitalize: this.capitalize,
                truncate: this.truncate,
                renderRating: this.renderRating,
                renderImage: this.renderImage,
                parseRating: this.parseRating,
                parseImage: this.parseImage
            }
        };

        return this.renderTemplate(template, context);
    }

    /**
     * Render header template with context
     * @param {string} template - Header template
     * @param {Object} column - Column configuration
     * @param {string} label - Column label
     * @param {boolean} isGridLabel - Whether this is for grid layout
     * @returns {string} Rendered header HTML
     */
    renderHeaderTemplate(template, column, label, isGridLabel = false) {
        const context = {
            column,
            label,
            isGridLabel,
            // Helper functions available in templates
            helpers: {
                renderText: this.renderText,
                formatDate: this.formatDate,
                formatNumber: this.formatNumber,
                formatCurrency: this.formatCurrency,
                capitalize: this.capitalize,
                truncate: this.truncate,
                renderRating: this.renderRating,
                renderImage: this.renderImage,
                parseRating: this.parseRating,
                parseImage: this.parseImage
            }
        };

        return this.renderTemplate(template, context);
    }

    /**
     * Process schema to sanitize templates
     * @param {Array} schema - Grid schema array
     * @returns {Array} Processed schema with sanitized templates
     */
    processSchemaTemplates(schema) {
        return schema.map(col => {
            const processedCol = { ...col };
            
            if (processedCol.headerTemplate) {
                const sanitized = this.sanitizeTemplate(processedCol.headerTemplate);
                const validation = this.validateTemplate(sanitized);
                
                if (validation.isValid) {
                    processedCol.headerTemplate = sanitized;
                } else {
                    console.error(`Invalid header template for column ${col.key}:`, validation.errors);
                    delete processedCol.headerTemplate;
                }
            }
            
            if (processedCol.cellTemplate) {
                const sanitized = this.sanitizeTemplate(processedCol.cellTemplate);
                const validation = this.validateTemplate(sanitized);
                
                if (validation.isValid) {
                    processedCol.cellTemplate = sanitized;
                } else {
                    console.error(`Invalid cell template for column ${col.key}:`, validation.errors);
                    delete processedCol.cellTemplate;
                }
            }
            
            return processedCol;
        });
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

    // Template helper functions

    /**
     * Render text helper - safely renders text content
     * @param {*} value - Value to render as text
     * @returns {string} Escaped HTML text
     */
    renderText(value) {
        if (value === null || value === undefined) return '';
        return this.escapeHtml(String(value));
    }

    /**
     * Format date helper
     * @param {*} date - Date value
     * @param {string} format - Date format (optional)
     * @returns {string} Formatted date
     */
    formatDate(date, format = 'short') {
        if (!date) return '';
        
        try {
            const d = new Date(date);
            if (isNaN(d.getTime())) return String(date);
            
            switch (format) {
                case 'short':
                    return d.toLocaleDateString();
                case 'long':
                    return d.toLocaleDateString(undefined, { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    });
                case 'time':
                    return d.toLocaleTimeString();
                case 'datetime':
                    return d.toLocaleString();
                default:
                    return d.toLocaleDateString();
            }
        } catch (error) {
            return String(date);
        }
    }

    /**
     * Format number helper
     * @param {*} number - Number value
     * @param {number} decimals - Number of decimal places
     * @returns {string} Formatted number
     */
    formatNumber(number, decimals = 0) {
        if (number == null || isNaN(number)) return '';
        return Number(number).toFixed(decimals);
    }

    /**
     * Format currency helper
     * @param {*} amount - Currency amount
     * @param {string} currency - Currency code
     * @returns {string} Formatted currency
     */
    formatCurrency(amount, currency = 'USD') {
        if (amount == null || isNaN(amount)) return '';
        
        try {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currency
            }).format(amount);
        } catch (error) {
            return `${currency} ${this.formatNumber(amount, 2)}`;
        }
    }

    /**
     * Capitalize text helper
     * @param {*} text - Text to capitalize
     * @returns {string} Capitalized text
     */
    capitalize(text) {
        if (!text) return '';
        const str = String(text);
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    /**
     * Truncate text helper
     * @param {*} text - Text to truncate
     * @param {number} length - Maximum length
     * @param {string} suffix - Truncation suffix
     * @returns {string} Truncated text
     */
    truncate(text, length = 50, suffix = '...') {
        if (!text) return '';
        const str = String(text);
        if (str.length <= length) return str;
        return str.substring(0, length - suffix.length) + suffix;
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
     * Render rating display with stars (template helper)
     * @param {*} value - Rating value (number, string, or object)
     * @param {Object} options - Rendering options
     * @returns {string} Rating HTML
     */
    renderRating(value, options = {}) {
        const rating = this.parseRating(value);
        if (!rating.isValid) {
            return '<span title="Invalid rating">—</span>';
        }

        const {
            showText = false,
            starChar = '★',
            emptyChar = '☆',
            className = 'rating',
            showValue = false
        } = options;

        const stars = [];
        for (let i = 1; i <= rating.max; i++) {
            const isFilled = i <= rating.value;
            const char = isFilled ? starChar : emptyChar;
            stars.push(`<span class="rating-star ${isFilled ? 'filled' : 'empty'}">${char}</span>`);
        }

        let content = `<div class="${className}" aria-label="Rating: ${rating.value} out of ${rating.max}">`;
        content += stars.join('');
        
        if (showText || showValue) {
            content += `<span class="rating-text">${rating.value}/${rating.max}</span>`;
        }
        
        content += `<span class="sr-only">Rating: ${rating.value} out of ${rating.max}</span>`;
        content += '</div>';

        return content;
    }

    /**
     * Render image with proper sizing and error handling (template helper)
     * @param {*} value - Image value (string URL or object with src/alt)
     * @param {Object} options - Rendering options
     * @returns {string} Image HTML
     */
    renderImage(value, options = {}) {
        const image = this.parseImage(value);
        const {
            isGridImage = false,
            className = isGridImage ? 'grid-image' : 'table-image',
            placeholderClass = isGridImage ? 'grid-image-placeholder' : 'table-image-placeholder',
            placeholderIcon = '📷',
            width,
            height,
            style = ''
        } = options;
        
        if (!image.src) {
            return `<div class="${placeholderClass}" title="No image">${placeholderIcon}</div>`;
        }

        const id = `img-${Math.random().toString(36).slice(2)}`;
        let imgStyle = style;
        if (width) imgStyle += `width: ${width}; `;
        if (height) imgStyle += `height: ${height}; `;
        
        // Note: Error handling would need to be set up after DOM insertion
        // This is handled by the calling extension or grid
        return `<img id="${id}" class="${className}" src="${this.escapeHtml(image.src)}" alt="${this.escapeHtml(image.alt)}" style="${imgStyle}" />`;
    }

    /**
     * Get template usage statistics
     * @param {Array} schema - Grid schema
     * @returns {Object} Template usage stats
     */
    getTemplateStats(schema) {
        let headerTemplates = 0;
        let cellTemplates = 0;
        const columns = [];

        schema.forEach(col => {
            const columnInfo = { key: col.key, hasHeaderTemplate: false, hasCellTemplate: false };
            
            if (col.headerTemplate) {
                headerTemplates++;
                columnInfo.hasHeaderTemplate = true;
            }
            
            if (col.cellTemplate) {
                cellTemplates++;
                columnInfo.hasCellTemplate = true;
            }
            
            columns.push(columnInfo);
        });

        return {
            totalColumns: schema.length,
            headerTemplates,
            cellTemplates,
            columns
        };
    }

    /**
     * Create a simple template for common use cases
     * @param {string} type - Template type ('badge', 'link', 'progress', 'avatar', 'rating', 'image')
     * @param {Object} options - Template options
     * @returns {string} Generated template
     */
    createTemplate(type, options = {}) {
        switch (type) {
            case 'badge':
                return `<span class="badge badge-{{${options.colorField || 'status'}}">{{${options.valueField || 'value'}}}</span>`;
            
            case 'link':
                return `<a href="{{${options.urlField || 'url'}}}" target="${options.target || '_blank'}">{{${options.textField || 'value'}}}</a>`;
            
            case 'progress':
                return `<div class="progress"><div class="progress-bar" style="width: {{${options.valueField || 'value'}}}%">{{${options.valueField || 'value'}}}%</div></div>`;
            
            case 'avatar':
                return `<img class="avatar" src="{{${options.imageField || 'avatar'}}}" alt="{{${options.altField || 'name'}}}" title="{{${options.titleField || 'name'}}}">`;
            
            case 'rating':
                const showText = options.showText ? ', showText: true' : '';
                const showValue = options.showValue ? ', showValue: true' : '';
                const starChar = options.starChar ? `, starChar: '${options.starChar}'` : '';
                const emptyChar = options.emptyChar ? `, emptyChar: '${options.emptyChar}'` : '';
                const ratingOptions = [showText, showValue, starChar, emptyChar].filter(Boolean).join('');
                return `{{helpers.renderRating ${options.valueField || 'value'}${ratingOptions ? ` {${ratingOptions}}` : ''}}}`;
            
            case 'image':
                const width = options.width ? `, width: '${options.width}'` : '';
                const height = options.height ? `, height: '${options.height}'` : '';
                const isGridImage = options.isGridImage ? ', isGridImage: true' : '';
                const className = options.className ? `, className: '${options.className}'` : '';
                const imageOptions = [width, height, isGridImage, className].filter(Boolean).join('');
                return `{{helpers.renderImage ${options.valueField || 'value'}${imageOptions ? ` {${imageOptions}}` : ''}}}`;
            
            default:
                return '{{value}}';
        }
    }

    /**
     * Add CSS styles for template helpers (rating, image, etc.)
     */
    addTemplateStyles() {
        const css = `
            /* Rating template styles */
            .rating {
                display: inline-flex;
                align-items: center;
                gap: 2px;
            }

            .rating-star {
                color: var(--star-color, #ffc107);
                font-size: 16px;
                line-height: 1;
            }

            .rating-star.empty {
                color: #e1e5e9;
            }

            .rating-star.filled {
                color: var(--star-color, #ffc107);
            }

            .rating-text {
                margin-left: 4px;
                font-size: 0.9em;
                color: #656d76;
            }

            /* Image template styles for grid layout */
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

            /* Image template styles for table layout */
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
            grid.addExtensionStyles(css, 'templates');
        }
    }

    /**
     * Remove template styles from the grid
     */
    removeTemplateStyles() {
        const grid = this.getGrid();
        if (grid && grid.removeExtensionStyles) {
            grid.removeExtensionStyles('templates');
        }
    }
}

// Export for use in both ES modules and browser globals
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TemplateExtension;
} else if (typeof window !== 'undefined') {
    window.TemplateExtension = TemplateExtension;
}