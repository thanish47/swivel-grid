import { describe, it, expect, vi } from 'vitest';
import { createGrid } from '../setup.js';

const schema = [{ key: 'name', label: 'Name' }];

function makeRows(n) {
    return Array.from({ length: n }, (_, i) => ({ name: `Row ${i}` }));
}

// ─── _checkThresholdTrigger ───────────────────────────────────────────────────

describe('_checkThresholdTrigger', () => {
    it('fires swivel:pageThreshold when visible end is at 80% of page', () => {
        const el = createGrid(schema, makeRows(100));
        const pagExt = el.getExtension('pagination');
        pagExt._pageSize = 100;
        pagExt._currentPage = 1;
        pagExt._loading = false;
        pagExt._endReached = false;
        pagExt._lastTriggeredPage = 0;

        const events = [];
        el.addEventListener('swivel:pageThreshold', (e) => events.push(e));

        pagExt._checkThresholdTrigger(1, 80); // index 80 out of 100 = 80%

        expect(events).toHaveLength(1);
        expect(events[0].detail.pageNumber).toBe(1);
        expect(events[0].detail.nextPage).toBe(2);
    });

    it('does NOT fire when visible end is below 80%', () => {
        const el = createGrid(schema, makeRows(100));
        const pagExt = el.getExtension('pagination');
        pagExt._pageSize = 100;
        pagExt._loading = false;
        pagExt._endReached = false;
        pagExt._lastTriggeredPage = 0;

        const events = [];
        el.addEventListener('swivel:pageThreshold', (e) => events.push(e));

        pagExt._checkThresholdTrigger(1, 78); // 78/100 = 78% < 80%

        expect(events).toHaveLength(0);
    });

    it('does NOT fire when _loading is true', () => {
        const el = createGrid(schema, makeRows(100));
        const pagExt = el.getExtension('pagination');
        pagExt._pageSize = 100;
        pagExt._loading = true;
        pagExt._endReached = false;
        pagExt._lastTriggeredPage = 0;

        const events = [];
        el.addEventListener('swivel:pageThreshold', (e) => events.push(e));

        pagExt._checkThresholdTrigger(1, 99);

        expect(events).toHaveLength(0);
    });

    it('does NOT fire when _endReached is true', () => {
        const el = createGrid(schema, makeRows(100));
        const pagExt = el.getExtension('pagination');
        pagExt._pageSize = 100;
        pagExt._loading = false;
        pagExt._endReached = true;
        pagExt._lastTriggeredPage = 0;

        const events = [];
        el.addEventListener('swivel:pageThreshold', (e) => events.push(e));

        pagExt._checkThresholdTrigger(1, 99);

        expect(events).toHaveLength(0);
    });

    it('does NOT fire twice for the same page', () => {
        const el = createGrid(schema, makeRows(100));
        const pagExt = el.getExtension('pagination');
        pagExt._pageSize = 100;
        pagExt._loading = false;
        pagExt._endReached = false;
        pagExt._lastTriggeredPage = 0;

        const events = [];
        el.addEventListener('swivel:pageThreshold', (e) => events.push(e));

        pagExt._checkThresholdTrigger(1, 80);
        pagExt._loading = false; // reset loading to simulate ready state
        pagExt._checkThresholdTrigger(1, 80); // same page again

        expect(events).toHaveLength(1);
    });

    it('sets _endReached when currentPage >= totalPages', () => {
        const el = createGrid(schema, makeRows(50));
        const pagExt = el.getExtension('pagination');
        pagExt._totalPages = 5;
        pagExt._pageSize = 10;
        pagExt._loading = false;
        pagExt._endReached = false;
        pagExt._lastTriggeredPage = 0;

        pagExt._checkThresholdTrigger(5, 49); // currentPage == totalPages

        expect(pagExt._endReached).toBe(true);
    });

    it('calls loadMoreCallback when threshold reached and callback set', () => {
        const callback = vi.fn();
        const el = createGrid(schema, makeRows(100));
        const pagExt = el.getExtension('pagination');
        pagExt._totalPages = 10;
        pagExt._pageSize = 100;
        pagExt._loading = false;
        pagExt._endReached = false;
        pagExt._lastTriggeredPage = 0;
        pagExt._loadMoreCallback = callback;

        pagExt._checkThresholdTrigger(1, 80);

        expect(callback).toHaveBeenCalledOnce();
    });
});

// ─── Load-more section ────────────────────────────────────────────────────────

describe('Load-more section', () => {
    it('renders load-more section when totalPages is set and current page < total', () => {
        const el = createGrid(schema, makeRows(10), { totalPages: 5, pageSize: 10 });
        expect(el.shadowRoot.querySelector('.load-more-section')).not.toBeNull();
    });

    it('does NOT render load-more section when no totalPages', () => {
        const el = createGrid(schema, makeRows(10));
        expect(el.shadowRoot.querySelector('.load-more-section')).toBeNull();
    });

    it('shows spinner when loading is true', () => {
        const el = createGrid(schema, makeRows(10), { totalPages: 5, pageSize: 10 });
        // Set loading directly on extension then trigger render
        el.getExtension('pagination')._loading = true;
        el.render();
        const section = el.shadowRoot.querySelector('.load-more-section');
        expect(section).not.toBeNull();
        expect(section.querySelector('.spinner')).not.toBeNull();
    });

    it('shows load more button when loadMoreCallback is set and not loading', () => {
        const el = createGrid(schema, makeRows(10), { totalPages: 5, pageSize: 10 });
        el.loadMoreCallback = vi.fn();
        el.getExtension('pagination')._loading = false;
        el.render();
        const btn = el.shadowRoot.querySelector('#load-more-btn');
        expect(btn).not.toBeNull();
    });

    it('calls loadMoreCallback when load-more button is clicked', () => {
        const callback = vi.fn();
        const el = createGrid(schema, makeRows(10), { totalPages: 5, pageSize: 10 });
        el.loadMoreCallback = callback;
        el.getExtension('pagination')._loading = false;
        el.render();

        const btn = el.shadowRoot.querySelector('#load-more-btn');
        if (btn) btn.click();

        expect(callback).toHaveBeenCalledOnce();
    });
});

// ─── _updateCurrentPage ───────────────────────────────────────────────────────

describe('_updateCurrentPage', () => {
    it('sets _currentPage to 1 when _rows is empty', () => {
        const el = createGrid(schema, []);
        const pagExt = el.getExtension('pagination');
        pagExt._currentPage = 5;
        pagExt._updateCurrentPage();
        expect(pagExt._currentPage).toBe(1);
    });

    it('calculates page from rows length and pageSize', () => {
        const el = createGrid(schema, makeRows(25));
        const pagExt = el.getExtension('pagination');
        pagExt._pageSize = 10;
        pagExt._updateCurrentPage();
        expect(pagExt._currentPage).toBe(3); // ceil(25/10) = 3
    });
});
