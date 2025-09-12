# Column Types to Templates Migration Guide

This guide shows how to migrate from the deprecated `ColumnTypesExtension` to the more flexible `TemplateExtension` approach.

## Overview

The `ColumnTypesExtension` has been removed in favor of a more flexible template-based system. All rating and image functionality is now available through templates with enhanced customization options.

## Migration Examples

### Rating Columns

**Before (Column Types):**
```javascript
{
    key: 'rating',
    label: 'Rating',
    type: 'rating'  // ❌ Deprecated
}
```

**After (Templates):**
```javascript
{
    key: 'rating', 
    label: 'Rating',
    cellTemplate: '{{helpers.renderRating value}}'  // ✅ Use template
}
```

**Advanced Rating Templates:**
```javascript
// With custom star character and showing text
{
    key: 'rating',
    label: 'Rating', 
    cellTemplate: '{{helpers.renderRating value {starChar: "⭐", showText: true}}}'
}

// With custom max rating
{
    key: 'rating',
    label: 'Rating',
    cellTemplate: '{{helpers.renderRating value {max: 10, showValue: true}}}'
}

// Using object-based rating data
{
    key: 'userRating',
    label: 'User Rating',
    cellTemplate: '{{helpers.renderRating userRating.score {max: userRating.maxScore, showText: true}}}'
}
```

### Image Columns

**Before (Column Types):**
```javascript
{
    key: 'avatar',
    label: 'Avatar', 
    type: 'image'  // ❌ Deprecated
}
```

**After (Templates):**
```javascript
{
    key: 'avatar',
    label: 'Avatar',
    cellTemplate: '{{helpers.renderImage avatar}}'  // ✅ Use template
}
```

**Advanced Image Templates:**
```javascript
// For grid layout with custom size
{
    key: 'productImage',
    label: 'Product',
    cellTemplate: '{{helpers.renderImage productImage {isGridImage: true, width: "200px", height: "150px"}}}'
}

// With custom CSS class
{
    key: 'thumbnail',
    label: 'Thumbnail',
    cellTemplate: '{{helpers.renderImage thumbnail {className: "custom-thumbnail rounded"}}}'
}

// Using object-based image data
{
    key: 'photo',
    label: 'Photo',
    cellTemplate: '{{helpers.renderImage photo.url {className: "profile-pic", width: photo.width}}}'
}
```

### Complex Custom Templates

Templates are much more flexible than column types. Here are some advanced examples:

**Rating with Custom Styling:**
```javascript
{
    key: 'review',
    label: 'Review',
    cellTemplate: `
        <div class="review-container">
            {{helpers.renderRating rating {showText: true}}}
            <small class="review-count">({{reviewCount}} reviews)</small>
        </div>
    `
}
```

**Conditional Image Display:**
```javascript
{
    key: 'avatar',
    label: 'User',
    cellTemplate: `
        {{#if avatar}}
            {{helpers.renderImage avatar {className: "user-avatar"}}}
        {{else}}
            <div class="avatar-placeholder">{{initials}}</div>
        {{/if}}
    `
}
```

**Combined Rating and Status:**
```javascript
{
    key: 'product',
    label: 'Product Info',
    cellTemplate: `
        <div class="product-info">
            {{helpers.renderImage image {className: "product-thumb"}}}
            <div class="product-details">
                <strong>{{name}}</strong><br>
                {{helpers.renderRating rating}} 
                <span class="status status-{{status}}">{{status}}</span>
            </div>
        </div>
    `
}
```

## Helper Functions Available

### `renderRating(value, options)`

**Options:**
- `max`: Maximum rating value (default: 5)
- `starChar`: Star character to use (default: "★") 
- `emptyChar`: Empty star character (default: "☆")
- `showText`: Show rating text (default: false)
- `showValue`: Show numeric value (default: false)

**Examples:**
```javascript
{{helpers.renderRating 4}}                    // ★★★★☆
{{helpers.renderRating 4 {showText: true}}}   // ★★★★☆ (4 out of 5)  
{{helpers.renderRating 8 {max: 10}}}          // ★★★★★★★★☆☆
{{helpers.renderRating 3 {starChar: "⭐"}}}   // ⭐⭐⭐☆☆
```

### `renderImage(value, options)`

**Options:**
- `isGridImage`: Use grid layout styling (default: false)
- `className`: Custom CSS class
- `width`: Image width
- `height`: Image height  
- `placeholderClass`: Custom placeholder class

**Examples:**
```javascript
{{helpers.renderImage "photo.jpg"}}                              // Table image
{{helpers.renderImage url {isGridImage: true}}}                  // Grid image
{{helpers.renderImage src {className: "rounded", width: "60px"}}} // Custom styling
```

## Benefits of Templates Over Column Types

1. **More Flexible**: Combine multiple helpers in one template
2. **Better Customization**: Full control over HTML output and styling
3. **Conditional Logic**: Use if/else statements in templates
4. **Data Access**: Access any field from the row data
5. **Extensible**: Easy to add new helper functions
6. **Maintainable**: Single system for all cell customization
7. **Smaller Bundle**: Removes ~150-200 lines of code
8. **Better Performance**: More efficient rendering

## Styling

The same CSS classes are still available:
- `.rating`, `.rating-star`, `.rating-star.empty`
- `.grid-image`, `.table-image`
- `.grid-image-placeholder`, `.table-image-placeholder`

You can also use custom CSS classes through the template system:

```javascript
cellTemplate: '<div class="custom-rating">{{helpers.renderRating value}}</div>'
```

## Migration Checklist

- [ ] Replace `type: 'rating'` with `cellTemplate: '{{helpers.renderRating value}}'`
- [ ] Replace `type: 'image'` with `cellTemplate: '{{helpers.renderImage value}}'`
- [ ] Test that existing CSS styles still work
- [ ] Update any custom sorting logic to work with templates
- [ ] Remove references to `ColumnTypesExtension` from your code
- [ ] Verify bundle size reduction (~10-12KB smaller)

## Need Help?

If you need assistance migrating complex column type usage, please refer to the TemplateExtension documentation or create an issue in the project repository.