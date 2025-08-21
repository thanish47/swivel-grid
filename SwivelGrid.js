class SwivelGrid extends HTMLElement {
    static get observedAttributes() {
        return ['data', 'meta-data'];
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.data = null;
        this.metaData = null;
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'data') {
            this.parseData(newValue);
        } else if (name === 'meta-data') {
            this.parseMetaData(newValue);
        }
        this.render();
    }

    parseData(jsonString) {
        try {
            this.data = jsonString ? JSON.parse(jsonString) : null;
        } catch (error) {
            console.error('Invalid JSON in data attribute:', error);
            this.data = null;
        }
    }

    parseMetaData(jsonString) {
        try {
            this.metaData = jsonString ? JSON.parse(jsonString) : null;
        } catch (error) {
            console.error('Invalid JSON in meta-data attribute:', error);
            this.metaData = null;
        }
    }

    connectedCallback() {
        this.parseData(this.getAttribute('data'));
        this.parseMetaData(this.getAttribute('meta-data'));
        this.render();
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    padding: 20px;
                    font-family: Arial, sans-serif;
                    text-align: center;
                }
                
                .container {
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 40px;
                    border: 2px solid #007acc;
                    border-radius: 10px;
                    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                }
                
                h1 {
                    color: #007acc;
                    margin-bottom: 20px;
                    font-size: 2.5em;
                }
                
                p {
                    color: #333;
                    font-size: 1.2em;
                    line-height: 1.6;
                }

                .meta-data, .data {
                    margin: 20px 0;
                    text-align: left;
                }

                h3 {
                    color: #007acc;
                    margin-bottom: 10px;
                    font-size: 1.3em;
                }

                pre {
                    background: #f8f9fa;
                    border: 1px solid #e9ecef;
                    border-radius: 5px;
                    padding: 15px;
                    overflow-x: auto;
                    font-family: 'Courier New', monospace;
                    font-size: 0.9em;
                    white-space: pre-wrap;
                }
            </style>
            <div class="container">
                <h1>Swivel Grid</h1>
                ${this.renderContent()}
            </div>
        `;
    }

    renderContent() {
        if (!this.data && !this.metaData) {
            return `
                <p>Welcome to Swivel Grid - your web component is working!</p>
                <p>Add 'data' and 'meta-data' attributes with JSON to see the grid in action.</p>
            `;
        }

        let content = '';
        
        if (this.metaData) {
            content += `
                <div class="meta-data">
                    <h3>Meta Data:</h3>
                    <pre>${JSON.stringify(this.metaData, null, 2)}</pre>
                </div>
            `;
        }

        if (this.data) {
            content += `
                <div class="data">
                    <h3>Data:</h3>
                    <pre>${JSON.stringify(this.data, null, 2)}</pre>
                </div>
            `;
        }

        return content;
    }
}

customElements.define('swivel-grid', SwivelGrid);