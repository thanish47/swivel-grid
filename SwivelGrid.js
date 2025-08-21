class SwivelGrid extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
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
            </style>
            <div class="container">
                <h1>Swivel Grid</h1>
                <p>Welcome to Swivel Grid - your web component is working!</p>
                <p>This is a custom HTML element built with vanilla JavaScript.</p>
            </div>
        `;
    }
}

customElements.define('swivel-grid', SwivelGrid);