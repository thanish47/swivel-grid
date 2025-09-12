/**
 * CssClassesExtension for SwivelGrid
 * Handles CSS class sanitization, application, and management
 * Extracted from core SwivelGrid to support modular architecture
 */
class CssClassesExtension extends BaseExtension {
    constructor() {
        super('css-classes');
        this.priority = 30; // Should load after most other extensions but before final rendering
    }

    onInitialize(gridInstance) {
        this.grid = gridInstance;
        this.addCssClassesAPI();
        
        // CSS class configuration
        this.config = {
            enableSanitization: true,
            allowedCharacters: /[a-zA-Z0-9_-]/g,
            blacklistedClasses: ['script', 'eval', 'expression'],
            whitelistedPrefixes: [], // Optional: only allow specific prefixes
            maxClassNameLength: 100
        };
    }

    onBeforeRender(context) {
        // Process schema to ensure all CSS classes are sanitized
        if (context.schema) {
            context.schema = this.processSchemaClasses(context.schema);
        }
        
        return context;
    }

    /**
     * Add CSS classes API to grid instance
     */
    addCssClassesAPI() {
        const grid = this.getGrid();
        
        // Add sanitization method to grid
        grid.sanitizeClassName = this.sanitizeClassName.bind(this);
        
        // Add class application methods
        grid.applyCellClass = this.applyCellClass.bind(this);
        grid.applyHeaderClass = this.applyHeaderClass.bind(this);
        grid.applyRowClass = this.applyRowClass.bind(this);
        
        // Add configuration methods
        grid.setCssClassConfig = this.setConfig.bind(this);
        grid.getCssClassConfig = this.getConfig.bind(this);
    }

    /**
     * Sanitize CSS class names to prevent XSS and ensure valid CSS
     * @param {string} className - Class name(s) to sanitize
     * @returns {string} Sanitized class name(s)
     */
    sanitizeClassName(className) {
        if (!className || typeof className !== 'string') {
            return '';
        }

        // Split multiple classes and process each one
        return className
            .split(/\s+/)
            .map(cls => this.sanitizeSingleClassName(cls))
            .filter(cls => cls.length > 0)
            .join(' ');
    }

    /**
     * Sanitize a single CSS class name
     * @param {string} className - Single class name to sanitize
     * @returns {string} Sanitized class name
     */
    sanitizeSingleClassName(className) {
        if (!className) return '';

        // Trim and convert to string
        className = String(className).trim();

        // Check length
        if (className.length > this.config.maxClassNameLength) {
            console.warn(`CssClassesExtension: Class name "${className}" exceeds maximum length (${this.config.maxClassNameLength}), truncating`);
            className = className.substring(0, this.config.maxClassNameLength);
        }

        // Check blacklisted classes
        if (this.config.blacklistedClasses.some(blacklisted => 
            className.toLowerCase().includes(blacklisted.toLowerCase()))) {
            console.warn(`CssClassesExtension: Class name "${className}" contains blacklisted content, removing`);
            return '';
        }

        // Check whitelisted prefixes if configured
        if (this.config.whitelistedPrefixes.length > 0) {
            const hasValidPrefix = this.config.whitelistedPrefixes.some(prefix => 
                className.startsWith(prefix));
            if (!hasValidPrefix) {
                console.warn(`CssClassesExtension: Class name "${className}" doesn't match whitelisted prefixes`);
                return '';
            }
        }

        if (!this.config.enableSanitization) {
            return className;
        }

        // Remove invalid characters and ensure valid CSS class name format
        let sanitized = className.replace(/[^a-zA-Z0-9_-]/g, '');

        // CSS class names cannot start with a digit
        if (/^[0-9]/.test(sanitized)) {
            sanitized = 'cls-' + sanitized;
        }

        // CSS class names cannot be empty after sanitization
        if (!sanitized) {
            return '';
        }

        return sanitized;
    }

    /**
     * Apply CSS class to cell content
     * @param {string} content - Cell content HTML
     * @param {Object} column - Column configuration
     * @param {*} value - Cell value
     * @param {Object} row - Row data
     * @returns {string} Content with applied classes
     */
    applyCellClass(content, column, value, row) {
        if (!column.cellClass) {
            return content;
        }

        const sanitizedClass = this.sanitizeClassName(column.cellClass);
        if (!sanitizedClass) {
            return content;
        }

        // Don't wrap special content types that already have their own classes
        if (content.includes('class="rating"') || 
            content.includes('class="grid-image"') || 
            content.includes('class="table-image"')) {
            return content;
        }

        // Check if content is already wrapped with a class
        if (content.startsWith('<span class=') || content.startsWith('<div class=')) {
            return content;
        }

        return `<span class="${sanitizedClass}">${content}</span>`;
    }

    /**
     * Apply CSS class to header content
     * @param {string} content - Header content HTML
     * @param {Object} column - Column configuration
     * @returns {string} Content with applied classes
     */
    applyHeaderClass(content, column) {
        if (!column.headerClass) {
            return content;
        }

        const sanitizedClass = this.sanitizeClassName(column.headerClass);
        if (!sanitizedClass) {
            return content;
        }

        // Check if content is already wrapped with a class
        if (content.startsWith('<span class=') || content.startsWith('<div class=')) {
            return content;
        }

        return `<span class="${sanitizedClass}">${content}</span>`;
    }

    /**
     * Apply CSS class to row elements
     * @param {Object} row - Row data
     * @param {number} rowIndex - Row index
     * @returns {string} CSS classes for row
     */
    applyRowClass(row, rowIndex) {
        const classes = [];

        // Add row index class
        classes.push(`row-${rowIndex}`);

        // Add even/odd classes
        classes.push(rowIndex % 2 === 0 ? 'row-even' : 'row-odd');

        // Add row type classes based on data
        if (row.status) {
            const statusClass = this.sanitizeClassName(`row-status-${row.status}`);
            if (statusClass) {
                classes.push(statusClass);
            }
        }

        // Add priority classes
        if (row.priority) {
            const priorityClass = this.sanitizeClassName(`row-priority-${row.priority}`);
            if (priorityClass) {
                classes.push(priorityClass);
            }
        }

        // Add custom row class if specified
        if (row._cssClass) {
            const customClass = this.sanitizeClassName(row._cssClass);
            if (customClass) {
                classes.push(customClass);
            }
        }

        return classes.join(' ');
    }

    /**
     * Process schema to sanitize all CSS classes
     * @param {Array} schema - Grid schema
     * @returns {Array} Processed schema with sanitized classes
     */
    processSchemaClasses(schema) {
        return schema.map(column => {
            const processedColumn = { ...column };

            // Sanitize header class
            if (processedColumn.headerClass) {
                processedColumn.headerClass = this.sanitizeClassName(processedColumn.headerClass);
                if (!processedColumn.headerClass) {
                    delete processedColumn.headerClass;
                }
            }

            // Sanitize cell class
            if (processedColumn.cellClass) {
                processedColumn.cellClass = this.sanitizeClassName(processedColumn.cellClass);
                if (!processedColumn.cellClass) {
                    delete processedColumn.cellClass;
                }
            }

            // Sanitize column class (for entire column)
            if (processedColumn.columnClass) {
                processedColumn.columnClass = this.sanitizeClassName(processedColumn.columnClass);
                if (!processedColumn.columnClass) {
                    delete processedColumn.columnClass;
                }
            }

            return processedColumn;
        });
    }

    /**
     * Generate utility classes for grid styling
     * @returns {Object} Utility class generators
     */
    getUtilityClasses() {
        return {
            // Text alignment classes
            textAlign: {
                left: 'text-left',
                center: 'text-center',
                right: 'text-right',
                justify: 'text-justify'
            },

            // Text style classes
            textStyle: {
                bold: 'text-bold',
                italic: 'text-italic',
                underline: 'text-underline',
                strikethrough: 'text-strikethrough'
            },

            // Color classes
            textColor: {
                primary: 'text-primary',
                secondary: 'text-secondary',
                success: 'text-success',
                warning: 'text-warning',
                danger: 'text-danger',
                info: 'text-info'
            },

            // Background classes
            background: {
                primary: 'bg-primary',
                secondary: 'bg-secondary',
                success: 'bg-success',
                warning: 'bg-warning',
                danger: 'bg-danger',
                info: 'bg-info'
            },

            // Size classes
            size: {
                small: 'size-small',
                medium: 'size-medium',
                large: 'size-large'
            }
        };
    }

    /**
     * Generate CSS for utility classes
     * @returns {string} CSS string
     */
    generateUtilityCSS() {
        return `
            /* Text alignment utilities */
            .text-left { text-align: left; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .text-justify { text-align: justify; }

            /* Text style utilities */
            .text-bold { font-weight: bold; }
            .text-italic { font-style: italic; }
            .text-underline { text-decoration: underline; }
            .text-strikethrough { text-decoration: line-through; }

            /* Text color utilities */
            .text-primary { color: var(--color-primary, #0969da); }
            .text-secondary { color: var(--color-secondary, #656d76); }
            .text-success { color: var(--color-success, #1a7f37); }
            .text-warning { color: var(--color-warning, #9a6700); }
            .text-danger { color: var(--color-danger, #cf222e); }
            .text-info { color: var(--color-info, #0969da); }

            /* Background color utilities */
            .bg-primary { background-color: var(--bg-primary, rgba(9, 105, 218, 0.1)); }
            .bg-secondary { background-color: var(--bg-secondary, rgba(101, 109, 118, 0.1)); }
            .bg-success { background-color: var(--bg-success, rgba(26, 127, 55, 0.1)); }
            .bg-warning { background-color: var(--bg-warning, rgba(154, 103, 0, 0.1)); }
            .bg-danger { background-color: var(--bg-danger, rgba(207, 34, 46, 0.1)); }
            .bg-info { background-color: var(--bg-info, rgba(9, 105, 218, 0.1)); }

            /* Size utilities */
            .size-small { font-size: 0.875em; }
            .size-medium { font-size: 1em; }
            .size-large { font-size: 1.125em; }

            /* Row styling utilities */
            .row-even { background-color: var(--row-even-bg, transparent); }
            .row-odd { background-color: var(--row-odd-bg, rgba(0, 0, 0, 0.02)); }

            /* Status-based row classes */
            .row-status-active { border-left: 3px solid var(--color-success, #1a7f37); }
            .row-status-inactive { border-left: 3px solid var(--color-secondary, #656d76); }
            .row-status-pending { border-left: 3px solid var(--color-warning, #9a6700); }
            .row-status-error { border-left: 3px solid var(--color-danger, #cf222e); }

            /* Priority-based row classes */
            .row-priority-high { background-color: var(--priority-high-bg, rgba(207, 34, 46, 0.05)); }
            .row-priority-medium { background-color: var(--priority-medium-bg, rgba(154, 103, 0, 0.05)); }
            .row-priority-low { background-color: var(--priority-low-bg, rgba(101, 109, 118, 0.05)); }

            /* Column-specific utilities */
            .column-numeric { text-align: right; font-family: var(--font-mono, 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace); }
            .column-currency { text-align: right; font-weight: 500; }
            .column-date { white-space: nowrap; }
            .column-actions { text-align: center; }

            /* Hover effects for custom classes */
            .table-container tr:hover .bg-primary,
            .grid-card:hover .bg-primary { background-color: var(--bg-primary-hover, rgba(9, 105, 218, 0.15)); }
            
            .table-container tr:hover .bg-success,
            .grid-card:hover .bg-success { background-color: var(--bg-success-hover, rgba(26, 127, 55, 0.15)); }
            
            .table-container tr:hover .bg-warning,
            .grid-card:hover .bg-warning { background-color: var(--bg-warning-hover, rgba(154, 103, 0, 0.15)); }
            
            .table-container tr:hover .bg-danger,
            .grid-card:hover .bg-danger { background-color: var(--bg-danger-hover, rgba(207, 34, 46, 0.15)); }
        `;
    }

    /**
     * Set CSS classes configuration
     * @param {Object} config - Configuration object
     */
    setConfig(config) {
        this.config = { ...this.config, ...config };
    }

    /**
     * Get current CSS classes configuration
     * @returns {Object} Current configuration
     */
    getConfig() {
        return { ...this.config };
    }

    /**
     * Validate CSS class name against CSS specifications
     * @param {string} className - Class name to validate
     * @returns {Object} Validation result
     */
    validateClassName(className) {
        const result = {
            isValid: true,
            warnings: [],
            errors: []
        };

        if (!className || typeof className !== 'string') {
            result.isValid = false;
            result.errors.push('Class name must be a non-empty string');
            return result;
        }

        const trimmed = className.trim();
        
        // Check for empty class name after trim
        if (!trimmed) {
            result.isValid = false;
            result.errors.push('Class name cannot be empty or whitespace only');
            return result;
        }

        // Check length
        if (trimmed.length > this.config.maxClassNameLength) {
            result.warnings.push(`Class name exceeds recommended length of ${this.config.maxClassNameLength} characters`);
        }

        // Check for invalid starting character
        if (/^[0-9]/.test(trimmed)) {
            result.warnings.push('Class names should not start with a digit');
        }

        // Check for invalid characters
        const invalidChars = trimmed.match(/[^a-zA-Z0-9_-]/g);
        if (invalidChars) {
            result.warnings.push(`Class name contains invalid characters: ${invalidChars.join(', ')}`);
        }

        // Check for blacklisted content
        const blacklistedFound = this.config.blacklistedClasses.find(blacklisted => 
            trimmed.toLowerCase().includes(blacklisted.toLowerCase()));
        if (blacklistedFound) {
            result.isValid = false;
            result.errors.push(`Class name contains blacklisted content: ${blacklistedFound}`);
        }

        return result;
    }

    /**
     * Add utility CSS to the grid
     */
    addUtilityStyles() {
        const css = this.generateUtilityCSS();
        const grid = this.getGrid();
        if (grid && grid.addExtensionStyles) {
            grid.addExtensionStyles(css, 'css-classes-utilities');
        }
    }

    /**
     * Remove utility CSS from the grid
     */
    removeUtilityStyles() {
        const grid = this.getGrid();
        if (grid && grid.removeExtensionStyles) {
            grid.removeExtensionStyles('css-classes-utilities');
        }
    }

    onDestroy() {
        this.removeUtilityStyles();
    }

    /**
     * Get CSS class statistics
     * @param {Array} schema - Grid schema
     * @returns {Object} Class usage statistics
     */
    getClassStats(schema) {
        let headerClasses = 0;
        let cellClasses = 0;
        let columnClasses = 0;
        const classNames = new Set();

        schema.forEach(col => {
            if (col.headerClass) {
                headerClasses++;
                col.headerClass.split(/\s+/).forEach(cls => classNames.add(cls));
            }
            
            if (col.cellClass) {
                cellClasses++;
                col.cellClass.split(/\s+/).forEach(cls => classNames.add(cls));
            }

            if (col.columnClass) {
                columnClasses++;
                col.columnClass.split(/\s+/).forEach(cls => classNames.add(cls));
            }
        });

        return {
            totalColumns: schema.length,
            headerClasses,
            cellClasses,
            columnClasses,
            uniqueClassNames: Array.from(classNames),
            totalUniqueClasses: classNames.size
        };
    }
}

// Export for use in both ES modules and browser globals
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CssClassesExtension;
} else if (typeof window !== 'undefined') {
    window.CssClassesExtension = CssClassesExtension;
}