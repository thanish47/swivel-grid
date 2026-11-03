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
        el._pageSize = 100;
        el._currentPage = 1;
        el._loading = false;
        el._endReached = false;
        el._lastTriggeredPage = 0;

        const events = [];
        el.addEventListener('swivel:pageThreshold', (e) => events.push(e));

        el._checkThresholdTrigger(1, 80); // index 80 out of 100 = 80%

        expect(events).toHaveLength(1);
        expect(events[0].detail.pageNumber).toBe(1);
        expect(events[0].detail.nextPage).toBe(2);
    });

    it('does NOT fire when visible end is below 80%', () => {
        const el = createGrid(schema, makeRows(100));
        el._pageSize = 100;
        el._loading = false;
        el._endReached = false;
        el._lastTriggeredPage = 0;

        const events = [];
        el.addEventListener('swivel:pageThreshold', (e) => events.push(e));

        el._checkThresholdTrigger(1, 78); // 78/100 = 78% < 80%

        expect(events).toHaveLength(0);
    });

    it('does NOT fire when _loading is true', () => {
        const el = createGrid(schema, makeRows(100));
        el._pageSize = 100;
        el._loading = true;
        el._endReached = false;
        el._lastTriggeredPage = 0;

        const events = [];
        el.addEventListener('swivel:pageThreshold', (e) => events.push(e));

        el._checkThresholdTrigger(1, 99);

        expect(events).toHaveLength(0);
    });

    it('does NOT fire when _endReached is true', () => {
        const el = createGrid(schema, makeRows(100));
        el._pageSize = 100;
        el._loading = false;
        el._endReached = true;
        el._lastTriggeredPage = 0;

        const events = [];
        el.addEventListener('swivel:pageThreshold', (e) => events.push(e));

        el._checkThresholdTrigger(1, 99);

        expect(events).toHaveLength(0);
    });

    it('does NOT fire twice for the same page', () => {
        const el = createGrid(schema, makeRows(100));
        el._pageSize = 100;
        el._loading = false;
        el._endReached = false;
        el._lastTriggeredPage = 0;

        const events = [];
        el.addEventListener('swivel:pageThreshold', (e) => events.push(e));

        el._checkThresholdTrigger(1, 80);
        el._loading = false; // reset loading to simulate ready state
        el._checkThresholdTrigger(1, 80); // same page again

        expect(events).toHaveLength(1); // fired only once
    });

    it('sets _endReached when currentPage >= totalPages', () => {
        const el = createGrid(schema, makeRows(50), { totalPages: 5 });
        el._pageSize = 10;
        el._loading = false;
        el._endReached = false;
        el._lastTriggeredPage = 0;

        el._checkThresholdTrigger(5, 49); // currentPage == totalPages

        expect(el._endReached).toBe(true);
    });

    it('calls loadMoreCallback when threshold reached and callback set', () => {
        const callback = vi.fn();
        const el = createGrid(schema, makeRows(100), { totalPages: 10 });
        el._pageSize = 100;
        el._loading = false;
        el._endReached = false;
        el._lastTriggeredPage = 0;
        el.loadMoreCallback = callback;

        el._checkThresholdTrigger(1, 80);

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
        el.loading = true;
        const section = el.shadowRoot.querySelector('.load-more-section');
        expect(section).not.toBeNull();
        expect(section.querySelector('.spinner')).not.toBeNull();
    });

    it('shows load more button when loadMoreCallback is set and not loading', () => {
        const el = createGrid(schema, makeRows(10), { totalPages: 5, pageSize: 10 });
        el.loadMoreCallback = vi.fn();
        el._loading = false;
        el._updateLoadMoreSection();
        const btn = el.shadowRoot.querySelector('#load-more-btn');
        expect(btn).not.toBeNull();
    });

    it('calls loadMoreCallback when load-more button is clicked', () => {
        const callback = vi.fn();
        const el = createGrid(schema, makeRows(10), { totalPages: 5, pageSize: 10 });
        el.loadMoreCallback = callback;
        el._loading = false;
        el._updateLoadMoreSection();

        const btn = el.shadowRoot.querySelector('#load-more-btn');
        if (btn) btn.click();

        expect(callback).toHaveBeenCalledOnce();
    });
});

// ─── _updateCurrentPage ───────────────────────────────────────────────────────

describe('_updateCurrentPage', () => {
    it('sets _currentPage to 1 when _rows is empty', () => {
        const el = createGrid(schema, []);
        el._currentPage = 5;
        el._updateCurrentPage();
        expect(el._currentPage).toBe(1);
    });

    it('calculates page from rows length and pageSize', () => {
        const el = createGrid(schema, makeRows(25));
        el._pageSize = 10;
        el._updateCurrentPage();
        expect(el._currentPage).toBe(3); // ceil(25/10) = 3
    });
});
