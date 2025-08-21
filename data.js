const sampleData = [
    {"name": "John", "age": 30, "city": "New York"},
    {"name": "Jane", "age": 25, "city": "San Francisco"}, 
    {"name": "Bob", "age": 35, "city": "Chicago"},
    {"name": "Alice", "age": 28, "city": "Seattle"},
    {"name": "Charlie", "age": 32, "city": "Boston"}
];

const sampleMetaData = {
    "title": "User Data",
    "columns": ["name", "age", "city"],
    "sortable": true,
    "pagination": {
        "pageSize": 10,
        "currentPage": 1
    },
    "theme": "default"
};

window.addEventListener('DOMContentLoaded', () => {
    const swivelGrid = document.querySelector('swivel-grid');
    if (swivelGrid) {
        swivelGrid.setAttribute('data', JSON.stringify(sampleData));
        swivelGrid.setAttribute('meta-data', JSON.stringify(sampleMetaData));
    }
});