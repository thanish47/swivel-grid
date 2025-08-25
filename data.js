const sampleSchema = [
    { label: "Image", key: "image", type: "image", minWidth: "120px" },
    { 
        label: "Name", 
        key: "name", 
        minWidth: "180px",
        headerTemplate: '<span style="color: #007acc; font-weight: bold;">📦 {{label}}</span>',
        cellTemplate: '<div style="display: flex; align-items: center; gap: 8px;"><span style="font-weight: 600; color: #24292f;">{{value}}</span></div>'
    },
    { 
        label: "Price", 
        key: "price",
        cellTemplate: '<span style="color: #28a745; font-weight: 600; font-size: 1.1em;">{{value}}</span>'
    },
    { label: "Rating", key: "rating", type: "rating", sort: "DESC" }
];

const sampleRows = [
    {
        image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&h=200&fit=crop",
        name: "Wireless Headphones",
        price: "$199.99",
        rating: "4/5"
    },
    {
        image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&h=200&fit=crop",
        name: "Running Shoes", 
        price: "$129.99",
        rating: { value: 5, max: 5 }
    },
    {
        image: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=200&h=200&fit=crop",
        name: "Smart Watch",
        price: "$299.99", 
        rating: 3
    },
    {
        image: "https://images.unsplash.com/photo-1588099768523-f4e6a5679d88?w=200&h=200&fit=crop",
        name: "Coffee Mug",
        price: "$24.99",
        rating: "2/5"
    },
    {
        image: "https://images.unsplash.com/photo-1541753236788-b0ac1fc5009d?w=200&h=200&fit=crop",
        name: "Laptop Stand",
        price: "$89.99",
        rating: 4
    }
];

window.addEventListener('DOMContentLoaded', () => {
    const swivelGrid = document.querySelector('swivel-grid');
    if (swivelGrid) {
        // Set via attributes
        swivelGrid.setAttribute('schema', JSON.stringify(sampleSchema));
        swivelGrid.setAttribute('rows', JSON.stringify(sampleRows));
        swivelGrid.setAttribute('layout-type', 'grid');
        swivelGrid.setAttribute('search-input', '#product-search');

        // Set via properties for event handlers
        swivelGrid.sortHandler = ({ key, direction }) => {
            console.log('Sorted by:', key, direction);
        };

        swivelGrid.pageUpHandler = (pageNumber) => {
            console.log('Page up to:', pageNumber);
        };

        swivelGrid.pageDownHandler = (pageNumber) => {
            console.log('Page down to:', pageNumber);
            // Simulate loading more data when reaching new pages
            if (pageNumber > 1) {
                console.log('Loading page', pageNumber);
            }
        };

        // Set pagination properties
        swivelGrid.pageSize = 3; // Small page size for demo
        swivelGrid.totalPages = 10; // Demo total pages
        
        // Set up load more functionality
        swivelGrid.loadMoreCallback = () => {
            console.log('Load more clicked');
            swivelGrid.loading = true;
            
            // Simulate API call
            setTimeout(() => {
                const newData = [
                    {
                        image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=200&h=200&fit=crop",
                        name: `Product ${Date.now()}`,
                        price: `$${(Math.random() * 200 + 50).toFixed(2)}`,
                        rating: Math.floor(Math.random() * 5) + 1
                    },
                    {
                        image: "https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=200&h=200&fit=crop",
                        name: `Product ${Date.now() + 1}`,
                        price: `$${(Math.random() * 200 + 50).toFixed(2)}`,
                        rating: Math.floor(Math.random() * 5) + 1
                    },
                    {
                        image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&h=200&fit=crop",
                        name: `Product ${Date.now() + 2}`,
                        price: `$${(Math.random() * 200 + 50).toFixed(2)}`,
                        rating: Math.floor(Math.random() * 5) + 1
                    }
                ];
                
                swivelGrid.setPageData(newData); // Append as new page
                swivelGrid.loading = false;
            }, 1500);
        };

        swivelGrid.searchHandler = (query) => {
            console.log('Search query:', query);
            // Simple client-side filtering
            if (query.trim() === '') {
                swivelGrid.setData(sampleRows);
            } else {
                const filtered = sampleRows.filter(row => 
                    row.name.toLowerCase().includes(query.toLowerCase())
                );
                swivelGrid.setData(filtered);
            }
        };

        // Listen to custom events
        swivelGrid.addEventListener('swivel:sort', (e) => {
            console.log('Sort event:', e.detail);
        });

        swivelGrid.addEventListener('swivel:search', (e) => {
            console.log('Search event:', e.detail);
        });

        // Demo: Add toggle button for layout switching
        const layoutToggle = document.getElementById('layout-toggle');
        if (layoutToggle) {
            layoutToggle.addEventListener('click', () => {
                const current = swivelGrid.getAttribute('layout-type') || 'grid';
                const newLayout = current === 'grid' ? 'table' : 'grid';
                swivelGrid.setAttribute('layout-type', newLayout);
                layoutToggle.textContent = `Switch to ${current === 'grid' ? 'Grid' : 'Table'} View`;
            });
        }

        // Demo: Add more data button
        const addDataBtn = document.getElementById('add-data');
        if (addDataBtn) {
            let counter = 0;
            addDataBtn.addEventListener('click', () => {
                counter++;
                const newData = [
                    {
                        image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=200&h=200&fit=crop",
                        name: `New Product ${counter}`,
                        price: `$${(Math.random() * 200 + 50).toFixed(2)}`,
                        rating: Math.floor(Math.random() * 5) + 1
                    }
                ];
                swivelGrid.appendData(newData);
            });
        }

        // Demo: Toggle templates button
        const templateToggle = document.getElementById('template-toggle');
        if (templateToggle) {
            let templatesEnabled = true;
            templateToggle.addEventListener('click', () => {
                templatesEnabled = !templatesEnabled;
                
                if (templatesEnabled) {
                    // Enable templates
                    const schemaWithTemplates = [
                        { label: "Image", key: "image", type: "image", minWidth: "120px" },
                        { 
                            label: "Name", 
                            key: "name", 
                            minWidth: "180px",
                            headerTemplate: '<span style="color: #007acc; font-weight: bold;">📦 {{label}}</span>',
                            cellTemplate: '<div style="display: flex; align-items: center; gap: 8px;"><span style="font-weight: 600; color: #24292f;">{{value}}</span></div>'
                        },
                        { 
                            label: "Price", 
                            key: "price",
                            cellTemplate: '<span style="color: #28a745; font-weight: 600; font-size: 1.1em;">{{value}}</span>'
                        },
                        { label: "Rating", key: "rating", type: "rating", sort: "DESC" }
                    ];
                    swivelGrid.schema = schemaWithTemplates;
                    templateToggle.textContent = 'Disable Templates';
                } else {
                    // Disable templates
                    const schemaWithoutTemplates = [
                        { label: "Image", key: "image", type: "image", minWidth: "120px" },
                        { label: "Name", key: "name", minWidth: "180px" },
                        { label: "Price", key: "price" },
                        { label: "Rating", key: "rating", type: "rating", sort: "DESC" }
                    ];
                    swivelGrid.schema = schemaWithoutTemplates;
                    templateToggle.textContent = 'Enable Templates';
                }
            });
        }

        // Demo: Toggle classes button
        const classToggle = document.getElementById('class-toggle');
        if (classToggle) {
            let classesEnabled = false;
            classToggle.addEventListener('click', () => {
                classesEnabled = !classesEnabled;
                
                if (classesEnabled) {
                    // Enable classes (without templates)
                    const schemaWithClasses = [
                        { 
                            label: "Image", 
                            key: "image", 
                            type: "image", 
                            minWidth: "120px",
                            headerClass: "header-secondary"
                        },
                        { 
                            label: "Name", 
                            key: "name", 
                            minWidth: "180px",
                            headerClass: "header-primary",
                            cellClass: "cell-highlight"
                        },
                        { 
                            label: "Price", 
                            key: "price",
                            headerClass: "header-secondary", 
                            cellClass: "cell-success"
                        },
                        { 
                            label: "Rating", 
                            key: "rating", 
                            type: "rating", 
                            sort: "DESC",
                            headerClass: "header-primary"
                        }
                    ];
                    swivelGrid.schema = schemaWithClasses;
                    classToggle.textContent = 'Disable Classes';
                } else {
                    // Disable classes (back to basic)
                    const schemaBasic = [
                        { label: "Image", key: "image", type: "image", minWidth: "120px" },
                        { label: "Name", key: "name", minWidth: "180px" },
                        { label: "Price", key: "price" },
                        { label: "Rating", key: "rating", type: "rating", sort: "DESC" }
                    ];
                    swivelGrid.schema = schemaBasic;
                    classToggle.textContent = 'Enable Classes';
                }
            });
        }
    }
});