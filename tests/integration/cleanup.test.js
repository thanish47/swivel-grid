import { describe, it, expect, vi } from 'vitest';
import { createGrid } from '../setup.js';

const schema = [{ key: 'name', label: 'Name' }];
const rows = [{ name: 'Alpha' }, { name: 'Beta' }];

// ─── disconnectedCallback ─────────────────────────────────────────────────────

describe('disconnectedCallback', () => {
    it('clears _scrollContainer reference', () => {
        const el = createGrid(schema, rows);
        expect(el._scrollContainer).not.toBeNull(); // set after render

        document.body.removeChild(el);

        expect(el._scrollContainer).toBeNull();
    });

    it('clears _searchInputListener', () => {
        const input = document.createElement('input');
        input.id = 'cleanup-input';
        document.body.appendChild(input);

        const el = createGrid(schema, rows);
        el.searchInput = '#cleanup-input';
        expect(el._searchInputListener).not.toBeNull();

        document.body.removeChild(el);

        expect(el._searchInputListener).toBeNull();
    });

    it('does not throw when disconnected without prior search input', () => {
        const el = createGrid(schema, rows);
        expect(() => document.body.removeChild(el)).not.toThrow();
    });
});

// ─── destroy ─────────────────────────────────────────────────────────────────

describe('destroy()', () => {
    it('clears _scrollContainer', () => {
        const el = createGrid(schema, rows);
        expect(el._scrollContainer).not.toBeNull();

        el.destroy();

        expect(el._scrollContainer).toBeNull();
    });

    it('clears _searchInputListener', () => {
        const input = document.createElement('input');
        input.id = 'destroy-input';
        document.body.appendChild(input);

        const el = createGrid(schema, rows);
        el.searchInput = '#destroy-input';

        el.destroy();

        expect(el._searchInputListener).toBeNull();
    });

    it('does not throw when called multiple times', () => {
        const el = createGrid(schema, rows);
        expect(() => {
            el.destroy();
            el.destroy();
        }).not.toThrow();
    });

    it('setting loading after destroy does not throw', () => {
        const el = createGrid(schema, rows);
        el.destroy();
        expect(() => { el.loading = true; }).not.toThrow();
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

    it('setting non-function loadMoreCallback stores null', () => {
        const el = createGrid(schema, rows);
        el.loadMoreCallback = {};
        expect(el._loadMoreCallback).toBeNull();
    });

    it('render does not throw when shadowRoot is null', () => {
        const el = createGrid(schema, rows);
        // Simulate missing shadow root by overriding
        Object.defineProperty(el, 'shadowRoot', { get: () => null, configurable: true });
        expect(() => el.render()).not.toThrow();
    });
});
