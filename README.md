# Swivel Grid

A powerful, framework-agnostic web component for displaying data in flexible grid and table layouts with advanced features like sorting, searching, special column types, and accessibility support.

## Overview

Swivel Grid is a native web component built using the Web Components standard, making it compatible with vanilla JavaScript, React, Angular, Vue, and any other web framework. It provides a rich data visualization experience with professional styling and enterprise-grade features.

## Key Features

### 🎯 **Dual Layout Support**
- **Grid Layout**: Card-based responsive layout perfect for product catalogs and media galleries
- **Table Layout**: Traditional semantic table with sortable headers and sticky columns
- **Runtime Switching**: Toggle between layouts dynamically without data loss

### 🔧 **Advanced Column Types**
- **Text**: Standard text display with HTML escaping for security
- **Rating**: Smart rating display supporting multiple formats:
  - String format: `"4/5"`
  - Numeric: `4` (assumes /5)
  - Object: `{ value: 4, max: 5 }`
- **Image**: Responsive images with fallback placeholders:
  - URL string: `"https://example.com/image.jpg"`
  - Object: `{ src: "url", alt: "description" }`
- **Custom Templates**: Optional HTML templates for headers and cells:
  - Full access to row and column data
  - Automatic XSS protection
  - Fallback to default rendering

### 🔍 **Search & Filtering**
- **External Input Binding**: Automatically wire to any input element via CSS selector
- **Event-Driven**: Emit `swivel:search` events for server-side filtering
- **Client-Side Support**: Built-in filtering capabilities for local data

### 📊 **Interactive Sorting**
- **Click-to-Sort**: Click column headers to toggle ASC/DESC sorting
- **Visual Indicators**: Clear sort direction arrows in table headers
- **Custom Comparators**: Define per-column sort logic
- **Multi-Format Support**: Intelligent sorting for ratings, images, text, and numbers

### 🎨 **Responsive Design**
- **Mobile-First**: Adapts seamlessly to different screen sizes
- **Column Constraints**: Respect `minWidth` and `maxWidth` in table mode
- **Touch-Friendly**: Optimized for touch interactions

### ♿ **Accessibility First**
- **Semantic HTML**: Uses proper `<table>`, `<section>`, and ARIA roles
- **Screen Reader Support**: Hidden text labels and comprehensive ARIA attributes
- **Keyboard Navigation**: Full keyboard support for sorting and interaction
- **WCAG Compliant**: Meets web accessibility standards

### ⚡ **Performance Optimized**
- **Shadow DOM**: Style encapsulation and performance isolation
- **Efficient Updates**: Smart DOM diffing and batch updates
- **Virtual Scrolling Ready**: Built-in scroll detection for pagination
- **Memory Safe**: Proper cleanup and no memory leaks

## Installation & Usage

### Basic HTML Setup

```html
<!DOCTYPE html>
<html>
<head>
    <title>My App</title>
</head>
<body>
    <!-- Search input (optional) -->
    <input id="search" placeholder="Search..." />
    
    <!-- Component with inline attributes -->
    <swivel-grid
        layout-type="grid"
        search-input="#search"
        schema='[
            {"label": "Image", "key": "image", "type": "image"},
            {"label": "Name", "key": "name"},
            {"label": "Rating", "key": "rating", "type": "rating", "sort": "DESC"}
        ]'
        rows='[
            {"image": "https://example.com/product.jpg", "name": "Product A", "rating": "4/5"},
            {"image": "https://example.com/product2.jpg", "name": "Product B", "rating": 5}
        ]'>
    </swivel-grid>

    <script type="module" src="path/to/SwivelGrid.js"></script>
</body>
</html>
```

### JavaScript API

```javascript
const grid = document.querySelector('swivel-grid');

// Set data via properties (recommended)
grid.schema = [
    { label: "Product", key: "name", minWidth: "200px" },
    { label: "Price", key: "price" },
    { label: "Rating", key: "rating", type: "rating" }
];

grid.rows = [
    { name: "Widget A", price: "$19.99", rating: "4/5" },
    { name: "Widget B", price: "$24.99", rating: { value: 5, max: 5 } }
];

// Event handlers
grid.sortHandler = ({ key, direction }) => {
    console.log(`Sorted by ${key} ${direction}`);
    // Fetch sorted data from server
};

grid.searchHandler = (query) => {
    console.log(`Search: ${query}`);
    // Filter data or fetch from server
};

grid.scrollDownHandler = ({ lastVisibleIndex }) => {
    console.log(`Load more data after index ${lastVisibleIndex}`);
    // Implement infinite scroll
};

// Public methods
grid.setData(newRows);           // Replace all data
grid.appendData(moreRows);       // Add data efficiently
grid.layoutType = 'table';       // Switch layouts
```

### Framework Integration

#### React
```jsx
import { useRef, useEffect } from 'react';
import './SwivelGrid.js'; // Import the web component

function ProductGrid({ products }) {
    const gridRef = useRef();
    
    useEffect(() => {
        if (gridRef.current) {
            gridRef.current.rows = products;
            gridRef.current.sortHandler = ({ key, direction }) => {
                // Handle sort
            };
        }
    }, [products]);
    
    return (
        <swivel-grid
            ref={gridRef}
            layout-type="grid"
            schema={JSON.stringify(schema)}
        />
    );
}
```

#### Vue
```vue
<template>
    <swivel-grid
        ref="grid"
        layout-type="grid"
        :schema="JSON.stringify(schema)"
        @swivel:sort="handleSort"
        @swivel:search="handleSearch"
    />
</template>

<script>
import './SwivelGrid.js';

export default {
    mounted() {
        this.$refs.grid.rows = this.products;
    }
};
</script>
```

#### Angular
```typescript
// app.module.ts
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@NgModule({
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})

// component.ts
import './SwivelGrid.js';

@Component({
    template: `
        <swivel-grid
            #grid
            layout-type="grid"
            [attr.schema]="schemaJson"
            (swivel:sort)="onSort($event)"
        ></swivel-grid>
    `
})
export class ProductGridComponent {
    @ViewChild('grid') grid!: ElementRef;
    
    ngAfterViewInit() {
        this.grid.nativeElement.rows = this.products;
    }
}
```

## Data Contracts

### Column Definition (Schema)
```typescript
interface ColumnDef {
    label: string;           // Display name
    key: string;            // Data property key
    type?: 'text' | 'rating' | 'image';
    sort?: 'ASC' | 'DESC';  // Initial sort direction
    minWidth?: string;      // CSS width (e.g., "120px")
    maxWidth?: string;      // CSS width (e.g., "300px")
    sortComparator?: (a: any, b: any, rowA: Row, rowB: Row) => number;
    headerTemplate?: string; // Optional custom header HTML template
    cellTemplate?: string;   // Optional custom cell HTML template
    headerClass?: string;    // Optional CSS classes for header (default rendering only)
    cellClass?: string;      // Optional CSS classes for cell (default rendering only)
}
```

### Row Data
```typescript
type Row = Record<string, any>;

// Examples:
const sampleRows = [
    {
        id: 1,
        name: "Product Name",
        price: "$29.99",
        rating: "4/5",                    // String format
        image: "https://example.com/img.jpg"
    },
    {
        id: 2,
        name: "Another Product", 
        price: "$39.99",
        rating: { value: 5, max: 5 },    // Object format
        image: { src: "https://example.com/img2.jpg", alt: "Product image" }
    }
];
```

## Attributes vs Properties

### Attributes (HTML)
Use for initial setup and serializable values:
```html
<swivel-grid
    layout-type="grid"
    schema='[{"label":"Name","key":"name"}]'
    rows='[{"name":"Product A"}]'
    search-input="#search">
</swivel-grid>
```

### Properties (JavaScript)
**Properties take precedence** over attributes:
```javascript
// These will override any HTML attributes
grid.layoutType = 'table';
grid.schema = [{ label: "Name", key: "name" }];
grid.rows = [{ name: "Product A" }];
grid.searchInput = '#my-search';
```

## Custom Templates

Swivel Grid supports optional HTML templates for both headers and data cells, providing unlimited customization while maintaining security and performance.

### Template Features
- **Optional**: Templates are completely optional - without them, columns use default rendering
- **Secure**: Automatic sanitization prevents XSS attacks 
- **Context-Aware**: Access to column, row, and value data
- **Fallback Safe**: Errors fallback to default rendering

### Template Syntax

Templates use simple `{{expression}}` interpolation:

```javascript
const schema = [
    {
        label: "Product Name",
        key: "name",
        // Custom header with icon
        headerTemplate: '<span style="color: #007acc;">📦 {{label}}</span>',
        // Custom cell with styling
        cellTemplate: '<strong style="color: #24292f;">{{value}}</strong>'
    },
    {
        label: "Price", 
        key: "price",
        // Access nested row data
        cellTemplate: `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="color: #28a745; font-weight: 600;">{{value}}</span>
                {{#if row.discount}}
                    <small style="color: #dc3545;">{{row.discount}}% off</small>
                {{/if}}
            </div>
        `
    }
];
```

### Template Context

Templates have access to a rich context object:

#### Header Template Context
```javascript
{
    column: ColumnDef,     // Full column definition
    label: string,         // Column label
    isGridLabel: boolean   // True when rendering in grid cards
}
```

#### Cell Template Context  
```javascript
{
    value: any,           // Cell value for this column
    row: Row,             // Complete row data object
    column: ColumnDef,    // Full column definition  
    isGridImage: boolean  // True when rendering grid image
}
```

### Template Examples

#### Basic Styling
```javascript
{
    label: "Status",
    key: "status", 
    cellTemplate: `
        <span class="status status-{{value}}" 
              style="padding: 4px 8px; border-radius: 4px; font-size: 0.9em;">
            {{value}}
        </span>
    `
}
```

#### Complex Layout
```javascript
{
    label: "User Info",
    key: "user",
    cellTemplate: `
        <div style="display: flex; align-items: center; gap: 12px;">
            <img src="{{row.avatar}}" alt="{{value}}" 
                 style="width: 32px; height: 32px; border-radius: 50%;" />
            <div>
                <div style="font-weight: 600;">{{value}}</div>
                <div style="font-size: 0.85em; color: #666;">{{row.email}}</div>
            </div>
        </div>
    `
}
```

#### Conditional Content
```javascript
{
    label: "Actions",
    key: "id",
    headerTemplate: '<span style="text-align: center;">⚙️ Actions</span>',
    cellTemplate: `
        <div style="display: flex; gap: 4px;">
            <button onclick="edit({{value}})" style="padding: 4px 8px; font-size: 0.8em;">
                Edit
            </button>
            <button onclick="delete({{value}})" style="padding: 4px 8px; font-size: 0.8em; color: #dc3545;">
                Delete  
            </button>
        </div>
    `
}
```

#### Progress Bars
```javascript
{
    label: "Progress",
    key: "completion",
    cellTemplate: `
        <div style="display: flex; align-items: center; gap: 8px;">
            <div style="flex: 1; height: 8px; background: #f1f3f4; border-radius: 4px;">
                <div style="width: {{value}}%; height: 100%; background: #007acc; border-radius: 4px;"></div>
            </div>
            <span style="font-size: 0.85em; color: #666;">{{value}}%</span>
        </div>
    `
}
```

### Template Security

Templates are automatically sanitized to prevent XSS attacks:

- **Blocked**: `<script>`, `javascript:`, event handlers (`onclick`, etc.)
- **Allowed**: HTML structure, styling, data interpolation
- **Safe Fallback**: Malformed templates fallback to default rendering

### Performance Notes

- Templates are processed once during schema setup
- Rendering is optimized with template caching
- Large datasets perform well with simple templates
- Complex templates may impact performance with 1000+ rows

## CSS Classes

Swivel Grid supports optional CSS classes for default header and cell rendering. Classes are ignored when custom templates are used, providing a lighter-weight styling option.

### Class Properties

```javascript
{
    label: "Product Name",
    key: "name",
    headerClass: "header-primary text-bold",     // Multiple classes supported
    cellClass: "cell-highlight important"        // Applied to default content only
}
```

### Custom CSS Classes

The component doesn't include any built-in styling for classes - you define your own CSS. Here are some example classes you might implement:

#### Example Header Classes
```css
.header-primary {
    color: #007acc;
    font-weight: 700;
    text-transform: uppercase;
    font-size: 0.9em;
    letter-spacing: 0.5px;
}

.header-secondary {
    color: #6c757d;
    font-style: italic;
    font-size: 0.95em;
}
```

#### Example Cell Classes
```css
.cell-highlight {
    background: linear-gradient(90deg, #fff3cd 0%, transparent 100%);
    padding: 4px 8px;
    border-radius: 4px;
    font-weight: 600;
}

.cell-success { color: #28a745; font-weight: 600; }
.cell-warning { color: #ffc107; font-weight: 600; }
.cell-danger { color: #dc3545; font-weight: 600; }
.cell-muted { color: #6c757d; font-style: italic; }

.cell-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.85em;
    font-weight: 500;
    background: #e9ecef;
    color: #495057;
}
```

### Usage Examples

#### Basic Class Application
```javascript
const schema = [
    {
        label: "Status",
        key: "status",
        headerClass: "header-primary",
        cellClass: "cell-badge"
    },
    {
        label: "Revenue",
        key: "revenue", 
        headerClass: "header-secondary",
        cellClass: "cell-success"
    }
];
```

#### Advanced Custom Classes
```css
/* Define your own advanced classes */
.priority-header {
    background: linear-gradient(45deg, #007acc, #0056b3);
    color: white;
    padding: 8px;
    border-radius: 4px;
    text-align: center;
}

.priority-cell {
    border-left: 4px solid #007acc;
    padding-left: 8px;
    font-weight: 500;
    text-transform: capitalize;
}
```

```javascript
{
    label: "Priority",
    key: "priority",
    headerClass: "priority-header",
    cellClass: "priority-cell"
}
```

**Note**: The demo includes example implementations of these classes. In your own project, define whatever CSS classes suit your design system.

### Classes vs Templates

| Feature | Classes | Templates |
|---------|---------|-----------|
| **Complexity** | Simple | Full HTML control |
| **Performance** | Fast | Slightly slower |
| **Flexibility** | CSS styling only | Complete customization |
| **Security** | No XSS risk | Auto-sanitized |
| **Special Types** | Works with rating/image | Overrides everything |

### Important Notes

- **Template Priority**: If both `cellTemplate` and `cellClass` are provided, only the template is used
- **Special Types**: Classes apply to text content but not to rating stars or images
- **Multiple Classes**: Space-separated class names are supported
- **Inheritance**: Classes work with CSS cascade and inheritance
- **Performance**: Classes are more performant than templates for simple styling

## Events

All events are dispatched with `bubbles: true` and `composed: true`:

```javascript
grid.addEventListener('swivel:sort', (e) => {
    const { key, direction } = e.detail;
    // Handle sort: fetch new data, update UI, etc.
});

grid.addEventListener('swivel:search', (e) => {
    const { query } = e.detail;
    // Handle search: filter data, call API, etc.
});

grid.addEventListener('swivel:scrollUp', (e) => {
    const { firstVisibleIndex } = e.detail;
    // Handle scroll up: load previous page, etc.
});

grid.addEventListener('swivel:scrollDown', (e) => {
    const { lastVisibleIndex } = e.detail;
    // Handle scroll down: load next page, infinite scroll, etc.
});
```

## Styling & Customization

The component uses CSS custom properties for easy theming:

```css
swivel-grid {
    --primary-color: #007acc;      /* Accent color */
    --border-color: #e1e5e9;       /* Border color */
    --hover-color: #f8f9fa;        /* Hover background */
    --text-color: #24292f;         /* Text color */
    --star-color: #fbbf24;         /* Rating star color */
}
```

## Error Handling

The component gracefully handles various error conditions:
- **Invalid JSON**: Logs errors and uses empty arrays
- **Missing Properties**: Shows "—" placeholder
- **Image Load Failures**: Shows camera icon placeholder
- **Invalid Ratings**: Shows "—" with tooltip
- **Network Issues**: Continues to function with cached data

## Browser Support

- **Modern Browsers**: Chrome, Firefox, Safari, Edge (all current versions)
- **Web Components**: Uses native Custom Elements, Shadow DOM
- **Polyfills**: Include web components polyfill for older browsers if needed

## Performance Notes

- **Efficient Rendering**: Uses document fragments and smart DOM updates
- **Memory Management**: Proper cleanup prevents memory leaks
- **Scroll Optimization**: Debounced scroll handling with RAF
- **Large Datasets**: Built-in scroll detection for virtual scrolling integration

## Examples

See the included `index.html` for a complete working demo showcasing all features.

## Contributing

This is a production-ready component. For modifications:

1. Maintain backward compatibility
2. Follow the existing code patterns
3. Add tests for new features
4. Update this README for any API changes

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Swivel Grid** - Built for modern web applications that need powerful, accessible, and performant data visualization.