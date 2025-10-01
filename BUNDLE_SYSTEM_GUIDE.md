# SwivelGrid Bundle System Guide

## Overview

The SwivelGrid Bundle System provides a convenient way to load curated sets of extensions for different use cases. Instead of manually loading individual extensions, you can use pre-configured bundles that include the optimal combination of features for your needs.

## Quick Start

### Load Standard Bundle (Most Common)
```javascript
// Load standard bundle with essential features
await SwivelGridBundles.loadStandard(myGrid);

// Your grid now has: Layout Rendering, Templates, and Sorting
```

### Load Advanced Bundle (Full Features)
```javascript
// Load all available extensions
await SwivelGridBundles.loadAdvanced(myGrid);

// Your grid now has all features: Layout, Templates, Sorting, Search, Pagination, CSS Classes, Accessibility
```

### Load by Use Case (Recommended)
```javascript
// Automatically select the best bundle for your use case
await SwivelGridBundles.loadForUseCase(myGrid, 'admin-interface');
```

## Available Bundles

### StandardBundle
- **Size**: ~33-38KB minified (~600-650 lines)
- **Extensions**: LayoutRenderer + Templates + Sorting
- **Use Cases**: Data tables, sortable lists, product catalogs
- **Features**:
  - Table and grid layout rendering
  - Template-based cell customization  
  - Column sorting with indicators
  - Responsive design support

```javascript
await SwivelGridBundles.loadStandard(grid, { verbose: true });
```

### AdvancedBundle  
- **Size**: ~63-68KB minified (~1000-1050 lines)
- **Extensions**: All available extensions
- **Use Cases**: Enterprise applications, complex dashboards, admin interfaces
- **Features**:
  - All StandardBundle features plus:
  - Search input binding and filtering
  - Infinite scroll and pagination
  - Custom CSS class application
  - Full ARIA accessibility support
  - Keyboard navigation

```javascript
await SwivelGridBundles.loadAdvanced(grid, { verbose: true });
```

## Use Case Loading

The bundle system can automatically select the optimal configuration for common use cases:

```javascript
// Available use cases:
await SwivelGridBundles.loadForUseCase(grid, 'data-table');        // StandardBundle
await SwivelGridBundles.loadForUseCase(grid, 'product-catalog');   // StandardBundle  
await SwivelGridBundles.loadForUseCase(grid, 'admin-interface');   // AdvancedBundle (enterprise preset)
await SwivelGridBundles.loadForUseCase(grid, 'dashboard');         // AdvancedBundle (dashboard preset)
await SwivelGridBundles.loadForUseCase(grid, 'analytics');         // AdvancedBundle (data-heavy preset)
```

## Preset Configurations

AdvancedBundle includes preset configurations for specific scenarios:

```javascript
// Load specific presets
await SwivelGridBundles.loadPreset(grid, 'enterprise');      // All features
await SwivelGridBundles.loadPreset(grid, 'table-focused');   // Table + search + sort + pagination
await SwivelGridBundles.loadPreset(grid, 'dashboard');       // Layout + templates + CSS classes
await SwivelGridBundles.loadPreset(grid, 'data-heavy');      // Optimized for large datasets
await SwivelGridBundles.loadPreset(grid, 'minimal-interactive'); // Just layout + sorting
```

### Available Presets
- **enterprise**: All extensions for full-featured applications
- **table-focused**: Table rendering with search, sort, and pagination
- **dashboard**: Grid display with templates and custom styling  
- **data-heavy**: Templates with pagination and search for large datasets
- **minimal-interactive**: Basic interactivity with layout and sorting
- **designer**: Layout with templates and CSS classes for visual customization

## Custom Extension Loading

Load specific combinations of extensions:

```javascript
// Load custom combination
await SwivelGridBundles.loadCustom(grid, [
    'layout-renderer',
    'templates', 
    'sorting',
    'search'
]);
```

### Available Extensions
- `layout-renderer`: Table and grid rendering
- `templates`: Cell and header template processing with helpers
- `sorting`: Column sorting with template-aware comparison
- `search`: External search input binding and filtering
- `pagination`: Infinite scroll and page-based data loading
- `css-classes`: Custom CSS class application
- `accessibility`: ARIA labels and keyboard navigation

## Bundle Recommendations

Get recommendations based on your requirements:

```javascript
const recommendation = SwivelGridBundles.recommend({
    needsSorting: true,
    needsSearch: true,
    needsPagination: false,
    needsTemplates: true,
    needsAccessibility: true,
    needsCustomStyling: false,
    prioritizeSize: false
});

console.log(recommendation);
// {
//   bundle: 'advanced',
//   preset: 'enterprise', 
//   reason: 'Multiple advanced features required',
//   estimatedSize: '~63-68KB minified',
//   features: ['Table/Grid Rendering', 'Templates', 'Sorting', 'Search', 'Accessibility']
// }
```

## Bundle Information

Get detailed information about available bundles:

```javascript
const info = SwivelGridBundles.getInfo();
console.log(info.bundles);     // Bundle details
console.log(info.presets);     // Available presets
console.log(info.useCases);    // Use case recommendations
console.log(info.sizes);       // Size information
```

## Loading Options

All loading methods support options for customization:

```javascript
await SwivelGridBundles.loadStandard(grid, {
    verbose: true,           // Log loading progress
    // Additional options can be added in the future
});
```

## Error Handling

Bundle loading returns detailed results:

```javascript
const result = await SwivelGridBundles.loadStandard(grid);

if (result.success) {
    console.log('Loaded extensions:', result.loadedExtensions);
} else {
    console.error('Loading failed:', result.errors);
}
```

## Migration from Manual Loading

### Before (Manual Extension Loading)
```javascript
// Old way - manual loading
grid.registerExtension(new LayoutRendererExtension());
grid.registerExtension(new TemplateExtension());
grid.registerExtension(new SortingExtension());
```

### After (Bundle Loading)
```javascript
// New way - bundle loading
await SwivelGridBundles.loadStandard(grid);
```

Both approaches produce identical functionality, but bundles provide:
- Easier setup and configuration
- Optimized loading order
- Better dependency management
- Use case recommendations
- Size optimization guidance

## Compatibility

The bundle system is fully backward compatible:
- All existing extension APIs remain unchanged
- Manual extension loading still works
- Can mix bundle loading with manual extension addition
- All events and methods work as before

## File Structure

```
bundles/
├── index.js              # Main bundle exports and utilities
├── StandardBundle.js     # Standard bundle implementation
├── AdvancedBundle.js     # Advanced bundle implementation
└── BundleLoader.js       # Bundle loading utilities
```

## HTML Loading

Include bundle files after core and extensions:

```html
<!-- Core -->
<script src="SwivelGrid.js"></script>
<script src="extensions/BaseExtension.js"></script>

<!-- Extensions (as needed) -->
<script src="extensions/LayoutRendererExtension.js"></script>
<script src="extensions/TemplateExtension.js"></script>
<script src="extensions/SortingExtension.js"></script>
<!-- ... other extensions ... -->

<!-- Bundles -->
<script src="bundles/StandardBundle.js"></script>
<script src="bundles/AdvancedBundle.js"></script>
<script src="bundles/BundleLoader.js"></script>
<script src="bundles/index.js"></script>
```

## Performance Considerations

### Bundle Size Comparison
- **Core Only**: ~18KB minified (831 lines)
- **StandardBundle**: ~33-38KB minified (includes core + 3 extensions)
- **AdvancedBundle**: ~63-68KB minified (includes core + 7 extensions)

### Loading Performance
- Bundle loading is optimized for extension priority order
- Extensions are loaded asynchronously where possible
- Duplicate extension detection prevents conflicts
- Bundle metadata helps with debugging and monitoring

## Advanced Usage

### Custom Bundle Creation
```javascript
// Create your own bundle class
class CustomBundle extends AdvancedBundle {
    constructor() {
        super();
        this.name = 'custom';
        this.dependencies = ['LayoutRendererExtension', 'SortingExtension'];
    }
}
```

### Bundle Monitoring
```javascript
const loader = new BundleLoader();
const history = loader.getLoadHistory();
console.log('Loading history:', history);
```

### Compatibility Checking
```javascript
const compatibility = SwivelGridBundles.checkCompatibility(grid, 'standard');
if (!compatibility.compatible) {
    console.warn('Issues:', compatibility.issues);
}
```

## Best Practices

1. **Use bundle loading over manual loading** for easier maintenance
2. **Start with use case loading** to get optimal configuration automatically  
3. **Use StandardBundle for most applications** unless you need advanced features
4. **Consider bundle size** when prioritizing performance
5. **Test compatibility** when upgrading or changing bundles
6. **Use presets** for common scenarios instead of custom combinations
7. **Enable verbose logging** during development for better debugging

## Troubleshooting

### Common Issues

**Bundle not loading:**
```javascript
// Check dependencies are loaded
const missing = bundleLoader._checkDependencies();
if (missing.length > 0) {
    console.error('Missing dependencies:', missing);
}
```

**Extension conflicts:**
```javascript
// Check if extension already loaded
if (grid.hasExtension('sorting')) {
    console.log('Extension already loaded');
}
```

**Size concerns:**
```javascript
// Get size recommendations
const sizes = SwivelGridBundles.getInfo().sizes;
console.log('Bundle sizes:', sizes);
```

### Debug Mode

Enable verbose logging for detailed bundle loading information:

```javascript
await SwivelGridBundles.loadStandard(grid, { verbose: true });
// Logs each extension loading step and any issues
```