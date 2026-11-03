import { describe, it, expect, vi } from 'vitest';
import { createGrid } from '../setup.js';

const schema = [{ key: 'name', label: 'Name' }];
const rows = [{ name: 'Alpha' }, { name: 'Beta' }];

// ─── disconnectedCallback ─────────────────────────────────────────────────────

describe('disconnectedCallback', () => {
    it('clears extension references (extensions map is emptied)', () => {
        const el = createGrid(schema, rows);
        expect(el.listExtensions().length).toBeGreaterThan(0);

        document.body.removeChild(el);

        expect(el.listExtensions()).toHaveLength(0);
    });

    it('clears PaginationExtension scroll container reference', () => {
        const el = createGrid(schema, rows);
        const pagExt = el.getExtension('pagination');
        // After render, PaginationExtension has bound scroll listeners
        // Capture ref before disconnect
        const extRef = pagExt;

        document.body.removeChild(el);

        // onDestroy called: _unbindScrollListeners sets _scrollContainer = null
        expect(extRef._scrollContainer).toBeNull();
    });

    it('clears SearchExtension listener reference', () => {
        const input = document.createElement('input');
        input.id = 'cleanup-input';
        document.body.appendChild(input);

        const el = createGrid(schema, rows);
        el.searchInput = '#cleanup-input';
        const searchExt = el.getExtension('search');
        expect(searchExt.searchInputListener).not.toBeNull();
        const extRef = searchExt;

        document.body.removeChild(el);

        // onDestroy called: unbindSearchInput sets searchInputListener = null
        expect(extRef.searchInputListener).toBeNull();
    });

    it('does not throw when disconnected without prior search input', () => {
        const el = createGrid(schema, rows);
        expect(() => document.body.removeChild(el)).not.toThrow();
    });

    it('clears beforeRender and afterRender hook arrays', () => {
        const el = createGrid(schema, rows);
        document.body.removeChild(el);
        expect(el._extensionHooks.beforeRender).toHaveLength(0);
        expect(el._extensionHooks.afterRender).toHaveLength(0);
    });
});

// ─── destroy ─────────────────────────────────────────────────────────────────

describe('destroy()', () => {
    it('destroys all registered extensions', () => {
        const el = createGrid(schema, rows);
        const extNames = el.listExtensions();
        expect(extNames.length).toBeGreaterThan(0);

        el.destroy();

        // After destroy, extensions are removed from the map
        expect(el.listExtensions()).toHaveLength(0);
    });

    it('does not throw when called multiple times', () => {
        const el = createGrid(schema, rows);
        expect(() => {
            el.destroy();
            el.destroy();
        }).not.toThrow();
    });
});

// ─── General robustness ───────────────────────────────────────────────────────

describe('Robustness', () => {
    it('setting non-function sortHandler stores null', () => {
        const el = createGrid(schema, rows);
        el.sortHandler = 'not a function';
        expect(el._sortHandler).toBeNull();
    });

    it('setting non-function searchHandler stores null', () => {
        const el = createGrid(schema, rows);
        el.searchHandler = 42;
        expect(el._searchHandler).toBeNull();
    });

    it('render does not throw when shadowRoot is null', () => {
        const el = createGrid(schema, rows);
        Object.defineProperty(el, 'shadowRoot', { get: () => null, configurable: true });
        expect(() => el.render()).not.toThrow();
    });
});
