class d extends HTMLElement {
  static get observedAttributes() {
    return ["layout-type", "schema", "rows", "search-input"];
  }
  constructor() {
    super(), this.attachShadow({ mode: "open" }), this._layoutType = "grid", this._schema = [], this._rows = [], this._searchInput = null, this._propSet = {
      schema: !1,
      rows: !1,
      layoutType: !1,
      searchInput: !1
    }, this._sortHandler = null, this._searchHandler = null, this._searchInputListener = null, this._extensions = /* @__PURE__ */ new Map(), this._extensionHooks = {
      beforeRender: [],
      afterRender: []
    };
  }
  // Property getters/setters
  get schema() {
    return this._schema;
  }
  set schema(e) {
    this._propSet.schema = !0, this._schema = Array.isArray(e) ? this._processSchema(e) : [], this.render();
  }
  get rows() {
    return this._rows;
  }
  set rows(e) {
    this._propSet.rows = !0, this._rows = Array.isArray(e) ? e : [], this.render();
  }
  get layoutType() {
    return this._layoutType;
  }
  set layoutType(e) {
    this._propSet.layoutType = !0, this._layoutType = e === "table" || e === "list" ? "table" : "grid", this.render();
  }
  get searchInput() {
    return this._searchInput;
  }
  set searchInput(e) {
    var s;
    this._propSet.searchInput = !0, (s = this._unbindSearchInput) == null || s.call(this), this._searchInput = e || null;
    const t = this.getExtension("search");
    t && t.enabled ? t.bindSearchInput(e) : console.warn("SwivelGrid: SearchExtension required for search input binding.");
  }
  get sortHandler() {
    return this._sortHandler;
  }
  set sortHandler(e) {
    this._sortHandler = typeof e == "function" ? e : null;
  }
  // Pagination properties are now handled by PaginationExtension
  // Getters/setters will be added by the extension when loaded
  get searchHandler() {
    return this._searchHandler;
  }
  set searchHandler(e) {
    this._searchHandler = typeof e == "function" ? e : null;
  }
  // Extension Management
  registerExtension(e) {
    return !e || !e.name ? (console.warn("SwivelGrid: Extension must have a name"), !1) : this._extensions.has(e.name) ? (console.warn(`SwivelGrid: Extension "${e.name}" already registered`), !1) : (this._extensions.set(e.name, e), e.initialize(this), this._addToHook("beforeRender", e), this._addToHook("afterRender", e), !0);
  }
  unregisterExtension(e) {
    const t = this._extensions.get(e);
    return t ? (t.destroy(), this._extensions.delete(e), this._removeFromHook("beforeRender", t), this._removeFromHook("afterRender", t), !0) : !1;
  }
  getExtension(e) {
    return this._extensions.get(e) || null;
  }
  hasExtension(e) {
    return this._extensions.has(e);
  }
  listExtensions() {
    return Array.from(this._extensions.keys());
  }
  /**
   * Hot-replace an extension by name without touching other extensions.
   * If no extension with the given name is currently registered the new
   * instance is simply registered.
   * @param {string} name - Name of the extension to replace
   * @param {BaseExtension} newExtensionInstance - Replacement instance
   * @returns {boolean} true if registration of the new extension succeeded
   */
  swapExtension(e, t) {
    return this.unregisterExtension(e), this.registerExtension(t);
  }
  /**
   * Enable or disable an extension and optionally trigger a re-render.
   * @param {string} name - Extension name
   * @param {boolean} enabled - Desired enabled state
   * @param {boolean} [rerender=true] - Whether to re-render after toggling
   * @returns {boolean} false if the extension was not found, otherwise true
   */
  toggleExtension(e, t, s = !0) {
    const r = this.getExtension(e);
    return r ? (r.setEnabled(t), s && this.render(), !0) : !1;
  }
  _addToHook(e, t) {
    const s = this._extensionHooks[e];
    if (!s) return;
    let r = s.length;
    for (let n = 0; n < s.length; n++)
      if (t.priority < s[n].priority) {
        r = n;
        break;
      }
    s.splice(r, 0, t);
  }
  _removeFromHook(e, t) {
    const s = this._extensionHooks[e];
    if (!s) return;
    const r = s.indexOf(t);
    r >= 0 && s.splice(r, 1);
  }
  /**
   * Add CSS to the shadow DOM (for extension styling)
   * @param {string} css - CSS string
   * @param {string} id - Unique ID for the style element
   * @returns {boolean} Success status
   */
  addExtensionStyles(e, t) {
    if (!this.shadowRoot || !e || !t) return !1;
    const s = this.shadowRoot.querySelector(`style[data-extension-id="${t}"]`);
    s && s.remove();
    const r = document.createElement("style");
    return r.setAttribute("data-extension-id", t), r.textContent = e, this.shadowRoot.appendChild(r), !0;
  }
  /**
   * Remove extension styles
   * @param {string} id - Extension style ID
   * @returns {boolean} Success status
   */
  removeExtensionStyles(e) {
    if (!this.shadowRoot || !e) return !1;
    const t = this.shadowRoot.querySelector(`style[data-extension-id="${e}"]`);
    return t ? (t.remove(), !0) : !1;
  }
  /**
   * Add event listener to grid with automatic cleanup
   * @param {string} eventName - Event name
   * @param {Function} handler - Event handler
   * @param {string} extensionName - Extension name for cleanup
   * @returns {Function} Cleanup function
   */
  addExtensionEventListener(e, t, s) {
    this._extensionEventListeners || (this._extensionEventListeners = /* @__PURE__ */ new Map()), this._extensionEventListeners.has(s) || this._extensionEventListeners.set(s, []);
    const r = (n) => {
      try {
        t(n);
      } catch (o) {
        console.error(`Extension ${s} event handler error:`, o);
      }
    };
    return this.addEventListener(e, r), this._extensionEventListeners.get(s).push({
      eventName: e,
      handler: r
    }), () => this.removeEventListener(e, r);
  }
  /**
   * Clean up all event listeners for an extension
   * @param {string} extensionName - Extension name
   */
  cleanupExtensionEventListeners(e) {
    if (!this._extensionEventListeners) return;
    const t = this._extensionEventListeners.get(e);
    t && (t.forEach(({ eventName: s, handler: r }) => {
      this.removeEventListener(s, r);
    }), this._extensionEventListeners.delete(e));
  }
  attributeChangedCallback(e, t, s) {
    if (t !== s && !(e === "schema" && this._propSet.schema || e === "rows" && this._propSet.rows || e === "layout-type" && this._propSet.layoutType || e === "search-input" && this._propSet.searchInput)) {
      switch (e) {
        case "layout-type":
          this._layoutType = s === "table" || s === "list" ? "table" : "grid";
          break;
        case "schema":
          this._parseJsonAttribute("schema", s);
          break;
        case "rows":
          this._parseJsonAttribute("rows", s);
          break;
        case "search-input":
          this._searchInput = s;
          const r = this.getExtension("search");
          r && r.enabled ? r.bindSearchInput(s) : console.warn("SwivelGrid: SearchExtension required for search input binding.");
          break;
      }
      this.render();
    }
  }
  _parseJsonAttribute(e, t) {
    try {
      let s = t ? JSON.parse(t) : [];
      e === "schema" && (s = this._processSchema(s)), this[`_${e}`] = s;
    } catch (s) {
      console.error(`Invalid JSON in ${e} attribute:`, s), this[`_${e}`] = [];
    }
  }
  connectedCallback() {
    if (!this._propSet.layoutType) {
      const e = this.getAttribute("layout-type");
      this._layoutType = e === "table" || e === "list" ? "table" : "grid";
    }
    this._propSet.schema || this._parseJsonAttribute("schema", this.getAttribute("schema")), this._propSet.rows || this._parseJsonAttribute("rows", this.getAttribute("rows")), this._propSet.searchInput || (this._searchInput = this.getAttribute("search-input")), this.render();
  }
  disconnectedCallback() {
    for (const e of this._extensions.values())
      e.destroy();
    this._extensions.clear(), this._extensionHooks.beforeRender = [], this._extensionHooks.afterRender = [];
  }
  // Scroll listeners are now handled by PaginationExtension
  // Scroll handling is now handled by PaginationExtension
  _dispatchEvent(e, t) {
    this.dispatchEvent(new CustomEvent(`swivel:${e}`, {
      bubbles: !0,
      composed: !0,
      detail: t
    }));
  }
  dispatchExtensionEvent(e, t) {
    this._dispatchEvent(e, t);
  }
  getDOMElements() {
    var e, t;
    return {
      tbody: (e = this.shadowRoot) == null ? void 0 : e.querySelector("tbody"),
      gridContainer: (t = this.shadowRoot) == null ? void 0 : t.querySelector(".grid-container")
    };
  }
  // Public methods
  setData(e) {
    this._rows = Array.isArray(e) ? [...e] : [];
    const t = this.getExtension("pagination");
    t && t.enabled && t.resetPaginationState(), this.render(), this._dispatchEvent("data", { type: "set", length: this._rows.length });
  }
  // setPageData and appendData are now handled by PaginationExtension
  // These methods will be added to the grid instance when the extension loads
  destroy() {
    for (const e of this._extensions.values())
      e.destroy();
    this._extensions.clear(), this._extensionHooks.beforeRender = [], this._extensionHooks.afterRender = [];
  }
  render() {
    var r;
    if (!this.shadowRoot) return;
    const e = ((r = this.shadowRoot.querySelector(".scroll-container")) == null ? void 0 : r.scrollTop) ?? 0;
    let t = {
      schema: this._schema,
      rows: this._rows,
      layoutType: this._layoutType,
      searchInput: this._searchInput
    };
    for (const n of this._extensionHooks.beforeRender)
      if (n.enabled) {
        const o = n.beforeRender(t);
        o && (t = o);
      }
    if (this._schema = t.schema || this._schema, this._rows = t.rows || this._rows, this._layoutType = t.layoutType || this._layoutType, this.shadowRoot.innerHTML = `
            <style>
                ${this._getStyles()}
            </style>
            <div class="scroll-container">
                ${t.layoutHTML || this._renderLayout()}
                ${t.loadMoreHTML || ""}
            </div>
        `, e > 0) {
      const n = this.shadowRoot.querySelector(".scroll-container");
      n && (n.scrollTop = e);
    }
    const s = this.shadowRoot.querySelector(".scroll-container");
    for (const n of this._extensionHooks.afterRender)
      n.enabled && n.afterRender(t, s);
  }
  _renderAppendedRows(e) {
    const t = this.getExtension("layout-renderer");
    if (t && t.enabled) {
      t.renderAppendedRows(e, this._layoutType, this._schema);
      return;
    }
    console.warn("SwivelGrid: LayoutRendererExtension required for renderAppendedRows. Triggering full re-render instead."), this.render();
  }
  _getStyles() {
    return `
            :host {
                display: block;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                --primary-color: #007acc;
                --border-color: #e1e5e9;
                --hover-color: #f8f9fa;
                --text-color: #24292f;
            }

            .scroll-container {
                max-height: 600px;
                overflow: auto;
                border: 1px solid var(--border-color);
                border-radius: 6px;
            }

            /* Grid Layout Styles */
            .grid-container {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(${this._getMinCardWidth()}px, 1fr));
                gap: 16px;
                padding: 16px;
            }

            .grid-card {
                border: 1px solid var(--border-color);
                border-radius: 8px;
                padding: 16px;
                background: white;
                transition: box-shadow 0.2s ease;
            }

            .grid-card:hover {
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }

            .grid-card section[role="group"] {
                margin: 0;
            }


            .grid-field {
                margin-bottom: 8px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .grid-field:last-child {
                margin-bottom: 0;
            }

            .grid-field-label {
                font-weight: 600;
                color: var(--text-color);
                margin-right: 8px;
                min-width: 0;
            }

            .grid-field-value {
                color: #656d76;
                text-align: right;
                min-width: 0;
                word-break: break-word;
            }

            /* Table Layout Styles */
            .table-container {
                width: 100%;
                overflow-x: auto;
            }

            table {
                width: 100%;
                border-collapse: collapse;
                background: white;
            }

            th {
                background: #f6f8fa;
                border-bottom: 1px solid var(--border-color);
                padding: 12px 8px;
                text-align: left;
                font-weight: 600;
                color: var(--text-color);
                position: sticky;
                top: 0;
                cursor: pointer;
                user-select: none;
            }

            th:hover {
                background: #eaeef2;
            }

            th.sortable::after {
                content: '↕';
                margin-left: 4px;
                opacity: 0.5;
            }

            th.sort-asc::after {
                content: '↑';
                opacity: 1;
            }

            th.sort-desc::after {
                content: '↓';
                opacity: 1;
            }

            td {
                border-bottom: 1px solid #f1f3f4;
                padding: 12px 8px;
                vertical-align: middle;
            }

            tr:hover td {
                background: var(--hover-color);
            }



            /* Empty state */
            .empty-state {
                padding: 48px 24px;
                text-align: center;
                color: #656d76;
            }

            .empty-state h3 {
                margin: 0 0 8px 0;
                color: var(--text-color);
            }

            /* Screen reader only text */
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



            /* Responsive */
            @media (max-width: 768px) {
                .grid-container {
                    grid-template-columns: 1fr;
                }
                
                .scroll-container {
                    max-height: 400px;
                }
            }
        `;
  }
  _getMinCardWidth() {
    if (!this._schema.length) return 240;
    const e = this._schema.map((t) => t.minWidth).filter(Boolean).map((t) => /px$/.test(t) ? parseInt(t, 10) : NaN).filter(Number.isFinite);
    return e.length ? Math.max(...e) : 240;
  }
  _renderLayout() {
    if (!this._schema.length || !this._rows.length)
      return this._renderEmptyState();
    const e = this.getExtension("layout-renderer");
    return e && e.enabled ? this._layoutType === "table" ? e.renderTable() : e.renderGrid() : `<div class="extension-fallback">
            <p>LayoutRendererExtension required for rendering. Please load the extension.</p>
        </div>`;
  }
  _renderEmptyState() {
    return `
            <div class="empty-state">
                <h3>No data available</h3>
                <p>Add schema and rows to display content.</p>
            </div>
        `;
  }
  _renderCellContent(e, t, s = !1, r = null) {
    (!r || typeof r != "object") && (r = {});
    const n = this.getExtension("layout-renderer");
    if (n && n.enabled)
      return n.renderCellContent(e, t, s, r);
    if (t.cellTemplate) {
      const i = this.getExtension("templates");
      return i && i.enabled ? i.renderTemplate(t.cellTemplate, {
        value: e,
        row: r,
        column: t,
        isGridImage: s
      }) : (console.warn("SwivelGrid: TemplateExtension required for template rendering. Template will not be sanitized."), t.cellTemplate.replace(/\{\{(\w+)\}\}/g, (a, l) => {
        const h = { value: e, row: r, column: t, isGridImage: s };
        return this._escapeHtml(String(h[l] || ""));
      }));
    }
    if (e == null) {
      const i = "—";
      if (t.cellClass) {
        const a = this.getExtension("css-classes");
        return a && a.enabled ? a.applyCellClass(i, t, e, r) : `<span class="${this._sanitizeClassName(t.cellClass)}">${i}</span>`;
      }
      return i;
    }
    let o = this._escapeHtml(String(e));
    if (t.cellClass) {
      const i = this.getExtension("css-classes");
      return i && i.enabled ? i.applyCellClass(o, t, e, r) : `<span class="${this._sanitizeClassName(t.cellClass)}">${o}</span>`;
    }
    return o;
  }
  _getColumnStyles(e) {
    const t = [];
    return e.minWidth && t.push(`min-width: ${e.minWidth}`), e.maxWidth && t.push(`max-width: ${e.maxWidth}`), t.join("; ");
  }
  _escapeHtml(e) {
    const t = document.createElement("div");
    return t.textContent = e, t.innerHTML;
  }
  _renderHeaderContent(e, t = !1) {
    if (e.headerTemplate) {
      const r = this.getExtension("templates");
      return r && r.enabled ? r.renderTemplate(e.headerTemplate, {
        column: e,
        label: e.label,
        isGridLabel: t
      }) : (console.warn("SwivelGrid: TemplateExtension required for header template rendering. Template will not be sanitized."), e.headerTemplate.replace(/\{\{(\w+)\}\}/g, (n, o) => {
        const i = { column: e, label: e.label, isGridLabel: t };
        return this._escapeHtml(String(i[o] || ""));
      }));
    }
    const s = this._escapeHtml(e.label);
    if (e.headerClass) {
      const r = this.getExtension("css-classes");
      return r && r.enabled ? r.applyHeaderClass(s, e) : `<span class="${this._sanitizeClassName(e.headerClass)}">${s}</span>`;
    }
    return s;
  }
  _sanitizeClassName(e) {
    const t = this.getExtension("css-classes");
    return t && t.enabled ? t.sanitizeClassName(e) : typeof e == "string" ? e.split(/\s+/).map((s) => s.replace(/[^\w-]/g, "")).join(" ") : "";
  }
  /**
   * Get header ARIA attributes (uses AccessibilityExtension if available)
   * @param {Object} column - Column configuration
   * @returns {string} ARIA attributes
   */
  _getHeaderARIA(e) {
    const t = this.getExtension("accessibility");
    return t && t.enabled ? t.generateHeaderARIA(e) : [
      'role="columnheader"',
      'scope="col"',
      `tabindex="${e.sortable === !1 ? "-1" : "0"}"`,
      `aria-sort="${e.sort === "ASC" ? "ascending" : e.sort === "DESC" ? "descending" : "none"}"`,
      `aria-disabled="${e.sortable === !1 ? "true" : "false"}"`
    ].join(" ");
  }
  /**
   * Get container ARIA attributes (uses AccessibilityExtension if available)
   * @param {string} layoutType - Layout type
   * @returns {Object} ARIA attributes
   */
  _getContainerARIA(e) {
    const t = this.getExtension("accessibility");
    return t && t.enabled ? t.generateContainerARIA(e) : e === "grid" ? {
      container: 'role="list"',
      item: 'role="listitem"',
      group: 'role="group"'
    } : {
      container: 'role="table"',
      item: "",
      group: ""
    };
  }
  // Pagination UI and threshold methods are now handled by PaginationExtension
  _processSchema(e) {
    if (!Array.isArray(e)) return [];
    if (!e.some((r) => r.cellTemplate || r.headerTemplate)) return e.map((r) => ({ ...r }));
    const s = this.getExtension("templates");
    return s && s.enabled ? s.processSchemaTemplates(e) : (console.warn("SwivelGrid: TemplateExtension required for template processing. Templates will not be sanitized."), [...e]);
  }
}
customElements.get("swivel-grid") || customElements.define("swivel-grid", d);
export {
  d as SwivelGrid
};
