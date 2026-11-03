import { describe, it, expect, vi } from 'vitest';
import { createGrid } from '../setup.js';

const schema = [
    { key: 'name', label: 'Name' },
    { key: 'price', label: 'Price', sortable: false },
];
const rows = [{ name: 'A', price: 10 }, { name: 'B', price: 20 }];

// ─── Sort events ─────────────────────────────────────────────────────────────

describe('Sort events', () => {
    it('fires swivel:sort when a sortable header is clicked', () => {
        const el = createGrid(schema, rows, { layoutType: 'table' });
        const events = [];
        el.addEventListener('swivel:sort', (e) => events.push(e));

        el.shadowRoot.querySelector('th[data-key="name"]').click();

        expect(events).toHaveLength(1);
    });

    it('event detail contains key and direction', () => {
        const el = createGrid(schema, rows, { layoutType: 'table' });
        let detail;
        el.addEventListener('swivel:sort', (e) => { detail = e.detail; });

        el.shadowRoot.querySelector('th[data-key="name"]').click();

        expect(detail.key).toBe('name');
        expect(['ASC', 'DESC']).toContain(detail.direction);
    });

    it('first click sorts ASC', () => {
        const el = createGrid(schema, rows, { layoutType: 'table' });
        let detail;
        el.addEventListener('swivel:sort', (e) => { detail = e.detail; });

        el.shadowRoot.querySelector('th[data-key="name"]').click();

        expect(detail.direction).toBe('ASC');
    });

    it('second click on same header toggles to DESC', () => {
        const el = createGrid(schema, rows, { layoutType: 'table' });
        const directions = [];
        el.addEventListener('swivel:sort', (e) => directions.push(e.detail.direction));

        el.shadowRoot.querySelector('th[data-key="name"]').click();
        // After first click, shadow DOM is re-rendered; re-query
        el.shadowRoot.querySelector('th[data-key="name"]').click();

        expect(directions[0]).toBe('ASC');
        expect(directions[1]).toBe('DESC');
    });

    it('calls sortHandler callback with key and direction', () => {
        const handler = vi.fn();
        const el = createGrid(schema, rows, { layoutType: 'table' });
        el.sortHandler = handler;

        el.shadowRoot.querySelector('th[data-key="name"]').click();

        expect(handler).toHaveBeenCalledOnce();
        expect(handler).toHaveBeenCalledWith({ key: 'name', direction: 'ASC' });
    });

    it('does NOT fire swivel:sort for non-sortable column', () => {
        const el = createGrid(schema, rows, { layoutType: 'table' });
        const events = [];
        el.addEventListener('swivel:sort', (e) => events.push(e));

        el.shadowRoot.querySelector('th[data-key="price"]').click();

        expect(events).toHaveLength(0);
    });

    it('sorts rows on click (client-side, no pagination)', () => {
        const el = createGrid(schema, rows, { layoutType: 'table' });

        el.shadowRoot.querySelector('th[data-key="name"]').click();
        // After click, rows should be sorted ASC (A, B already in order)
        const cellTexts = [...el.shadowRoot.querySelectorAll('tbody td:first-child')].map(td => td.textContent.trim());
        expect(cellTexts).toEqual(['A', 'B']);
    });

    it('sort via keyboard Enter fires swivel:sort', () => {
        const el = createGrid(schema, rows, { layoutType: 'table' });
        const events = [];
        el.addEventListener('swivel:sort', (e) => events.push(e));

        const th = el.shadowRoot.querySelector('th[data-key="name"]');
        th.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

        expect(events).toHaveLength(1);
    });

    it('sort via keyboard Space fires swivel:sort', () => {
        const el = createGrid(schema, rows, { layoutType: 'table' });
        const events = [];
        el.addEventListener('swivel:sort', (e) => events.push(e));

        const th = el.shadowRoot.querySelector('th[data-key="name"]');
        th.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));

        expect(events).toHaveLength(1);
    });
});

// ─── Search events ────────────────────────────────────────────────────────────

describe('Search events', () => {
    it('fires swivel:search when input value changes', () => {
        const input = document.createElement('input');
        input.id = 'test-search';
        document.body.appendChild(input);

        const el = createGrid(schema, rows);
        el.searchInput = '#test-search';

        const events = [];
        el.addEventListener('swivel:search', (e) => events.push(e));

        input.value = 'hello';
        input.dispatchEvent(new Event('input', { bubbles: true }));

        expect(events).toHaveLength(1);
        expect(events[0].detail.query).toBe('hello');
    });

    it('calls searchHandler callback with query', () => {
        const handler = vi.fn();
        const input = document.createElement('input');
        input.id = 'test-search-handler';
        document.body.appendChild(input);

        const el = createGrid(schema, rows);
        el.searchInput = '#test-search-handler';
        el.searchHandler = handler;

        input.value = 'test';
        input.dispatchEvent(new Event('input', { bubbles: true }));

        expect(handler).toHaveBeenCalledWith('test');
    });

    it('does not throw for non-existent search selector', () => {
        const el = createGrid(schema, rows);
        expect(() => { el.searchInput = '#non-existent'; }).not.toThrow();
    });
});

// ─── Data events ─────────────────────────────────────────────────────────────

describe('Data events', () => {
    it('fires swivel:data after setData', () => {
        const el = createGrid(schema, rows);
        const events = [];
        el.addEventListener('swivel:data', (e) => events.push(e));

        el.setData([{ name: 'New', price: 99 }]);

        expect(events).toHaveLength(1);
        expect(events[0].detail.type).toBe('set');
    });

    it('fires swivel:data after appendData', () => {
        const el = createGrid(schema, rows);
        const events = [];
        el.addEventListener('swivel:data', (e) => events.push(e));

        el.appendData([{ name: 'Extra', price: 5 }]);

        expect(events).toHaveLength(1);
        expect(events[0].detail.type).toBe('append');
    });
});
