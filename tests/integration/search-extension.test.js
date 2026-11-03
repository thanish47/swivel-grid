import { describe, it, expect, vi } from 'vitest';
import { createGrid } from '../setup.js';

const schema = [{ key: 'name', label: 'Name' }];
const rows = [{ name: 'Alpha' }, { name: 'Beta' }];

function addInput(id) {
    const input = document.createElement('input');
    input.id = id;
    document.body.appendChild(input);
    return input;
}

function triggerInput(input, value) {
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
}

// ─── Binding ──────────────────────────────────────────────────────────────────

describe('SearchExtension binding', () => {
    it('fires swivel:search when bound input changes', () => {
        const input = addInput('se-a');
        const el = createGrid(schema, rows);
        el.searchInput = '#se-a';

        const events = [];
        el.addEventListener('swivel:search', e => events.push(e));

        triggerInput(input, 'hello');

        expect(events).toHaveLength(1);
        expect(events[0].detail.query).toBe('hello');
    });

    it('stores the listener reference on the extension', () => {
        const input = addInput('se-b');
        const el = createGrid(schema, rows);
        el.searchInput = '#se-b';

        const ext = el.getExtension('search');
        expect(ext.searchInputListener).not.toBeNull();
    });

    it('does not throw when given a non-existent selector', () => {
        const el = createGrid(schema, rows);
        expect(() => { el.searchInput = '#ghost-element'; }).not.toThrow();
    });

    it('does not throw when searchInput is set to null', () => {
        const el = createGrid(schema, rows);
        expect(() => { el.searchInput = null; }).not.toThrow();
    });
});

// ─── Re-binding ───────────────────────────────────────────────────────────────

describe('SearchExtension re-binding', () => {
    it('detaches from old input when searchInput is changed', () => {
        const input1 = addInput('se-c1');
        const input2 = addInput('se-c2');
        const el = createGrid(schema, rows);
        el.searchInput = '#se-c1';
        el.searchInput = '#se-c2';

        const events = [];
        el.addEventListener('swivel:search', e => events.push(e));

        triggerInput(input1, 'old');
        expect(events).toHaveLength(0);

        triggerInput(input2, 'new');
        expect(events).toHaveLength(1);
        expect(events[0].detail.query).toBe('new');
    });
});

// ─── searchHandler callback ───────────────────────────────────────────────────

describe('SearchExtension.searchHandler', () => {
    it('calls searchHandler with query string', () => {
        const input = addInput('se-d');
        const el = createGrid(schema, rows);
        el.searchInput = '#se-d';
        const handler = vi.fn();
        el.searchHandler = handler;

        triggerInput(input, 'test-query');

        expect(handler).toHaveBeenCalledWith('test-query');
    });
});

// ─── unbindSearchInput ────────────────────────────────────────────────────────

describe('SearchExtension.unbindSearchInput', () => {
    it('stops firing swivel:search after unbind', () => {
        const input = addInput('se-e');
        const el = createGrid(schema, rows);
        el.searchInput = '#se-e';

        el.getExtension('search').unbindSearchInput();

        const events = [];
        el.addEventListener('swivel:search', e => events.push(e));
        triggerInput(input, 'post-unbind');

        expect(events).toHaveLength(0);
    });

    it('sets searchInputListener to null after unbind', () => {
        const input = addInput('se-f');
        const el = createGrid(schema, rows);
        el.searchInput = '#se-f';

        const ext = el.getExtension('search');
        ext.unbindSearchInput();

        expect(ext.searchInputListener).toBeNull();
    });

    it('is safe to call when no input is bound', () => {
        const el = createGrid(schema, rows);
        expect(() => el.getExtension('search').unbindSearchInput()).not.toThrow();
    });
});

// ─── Cleanup on disconnect ────────────────────────────────────────────────────

describe('SearchExtension cleanup on disconnect', () => {
    it('does not fire swivel:search after grid is removed from DOM', () => {
        const input = addInput('se-g');
        const el = createGrid(schema, rows);
        el.searchInput = '#se-g';

        const events = [];
        el.addEventListener('swivel:search', e => events.push(e));

        document.body.removeChild(el);
        triggerInput(input, 'after disconnect');

        expect(events).toHaveLength(0);
    });
});
