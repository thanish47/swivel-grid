import { describe, it, expect, vi } from 'vitest';
import { createGrid } from '../setup.js';

const schema = [{ key: 'name', label: 'Name' }];
const rows = [{ name: 'Alpha' }, { name: 'Beta' }];

function addSearchInput(id) {
    const input = document.createElement('input');
    input.id = id;
    document.body.appendChild(input);
    return input;
}

// ─── searchInput binding ──────────────────────────────────────────────────────

describe('searchInput binding', () => {
    it('attaches a listener when selector matches an existing element', () => {
        const input = addSearchInput('search-a');
        const el = createGrid(schema, rows);
        el.searchInput = '#search-a';

        const events = [];
        el.addEventListener('swivel:search', (e) => events.push(e));

        input.value = 'query';
        input.dispatchEvent(new Event('input', { bubbles: true }));

        expect(events).toHaveLength(1);
        expect(events[0].detail.query).toBe('query');
    });

    it('does not throw when selector matches nothing', () => {
        const el = createGrid(schema, rows);
        expect(() => { el.searchInput = '#no-such-element'; }).not.toThrow();
    });

    it('does not throw when searchInput is set to null', () => {
        const el = createGrid(schema, rows);
        expect(() => { el.searchInput = null; }).not.toThrow();
    });

    it('replaces previous listener when searchInput is changed', () => {
        const input1 = addSearchInput('search-b1');
        const input2 = addSearchInput('search-b2');

        const el = createGrid(schema, rows);
        el.searchInput = '#search-b1';
        el.searchInput = '#search-b2'; // rebind

        const events = [];
        el.addEventListener('swivel:search', (e) => events.push(e));

        // Old input should no longer fire events
        input1.value = 'old';
        input1.dispatchEvent(new Event('input', { bubbles: true }));
        expect(events).toHaveLength(0);

        // New input should fire events
        input2.value = 'new';
        input2.dispatchEvent(new Event('input', { bubbles: true }));
        expect(events).toHaveLength(1);
    });
});

// ─── _unbindSearchInput ───────────────────────────────────────────────────────

describe('_unbindSearchInput', () => {
    it('stops firing swivel:search after unbind', () => {
        const input = addSearchInput('search-c');
        const el = createGrid(schema, rows);
        el.searchInput = '#search-c';

        el._unbindSearchInput();

        const events = [];
        el.addEventListener('swivel:search', (e) => events.push(e));

        input.value = 'after-unbind';
        input.dispatchEvent(new Event('input', { bubbles: true }));

        expect(events).toHaveLength(0);
    });

    it('clears _searchInputListener reference after unbind', () => {
        const input = addSearchInput('search-d');
        const el = createGrid(schema, rows);
        el.searchInput = '#search-d';

        el._unbindSearchInput();

        expect(el._searchInputListener).toBeNull();
    });
});

// ─── disconnectedCallback unbinds search ─────────────────────────────────────

describe('disconnectedCallback removes search listener', () => {
    it('does not fire swivel:search after element is disconnected', () => {
        const input = addSearchInput('search-e');
        const el = createGrid(schema, rows);
        el.searchInput = '#search-e';

        const events = [];
        el.addEventListener('swivel:search', (e) => events.push(e));

        document.body.removeChild(el); // triggers disconnectedCallback

        input.value = 'after disconnect';
        input.dispatchEvent(new Event('input', { bubbles: true }));

        expect(events).toHaveLength(0);
    });
});
