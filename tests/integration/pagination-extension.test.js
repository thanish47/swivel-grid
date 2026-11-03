import { describe, it, expect, vi } from 'vitest';
import { createGrid } from '../setup.js';

const schema = [{ key: 'name', label: 'Name' }];
const baseRows = Array.from({ length: 10 }, (_, i) => ({ name: `Row ${i + 1}` }));

function getPagExt(el) {
    return el.getExtension('pagination');
}

// ─── Dynamic API injection ────────────────────────────────────────────────────

describe('PaginationExtension dynamic API injection', () => {
    it('adds appendData method to grid', () => {
        const el = createGrid(schema, baseRows);
        expect(typeof el.appendData).toBe('function');
    });

    it('adds setPageData method to grid', () => {
        const el = createGrid(schema, baseRows);
        expect(typeof el.setPageData).toBe('function');
    });

    it('adds pageSize setter to grid', () => {
        const el = createGrid(schema, baseRows);
        el.pageSize = 3;
        expect(getPagExt(el)._pageSize).toBe(3);
    });

    it('adds totalPages setter to grid', () => {
        const el = createGrid(schema, baseRows);
        el.totalPages = 5;
        expect(getPagExt(el)._totalPages).toBe(5);
    });

    it('adds loading setter to grid', () => {
        const el = createGrid(schema, baseRows);
        el.loading = true;
        expect(getPagExt(el)._loading).toBe(true);
    });
});

// ─── appendData ───────────────────────────────────────────────────────────────

describe('PaginationExtension.appendData', () => {
    it('adds new rows to existing _rows', () => {
        const el = createGrid(schema, baseRows.slice(0, 3));
        el.appendData([{ name: 'Extra' }]);
        expect(el._rows).toHaveLength(4);
    });

    it('appends rows to DOM tbody', () => {
        const el = createGrid(schema, baseRows.slice(0, 2), { layoutType: 'table' });
        el.appendData([{ name: 'New' }]);
        expect(el.shadowRoot.querySelectorAll('tbody tr')).toHaveLength(3);
    });

    it('is a no-op for empty array', () => {
        const el = createGrid(schema, baseRows.slice(0, 2));
        const rowsBefore = el._rows.length;
        el.appendData([]);
        expect(el._rows.length).toBe(rowsBefore);
    });

    it('is a no-op for non-array input', () => {
        const el = createGrid(schema, baseRows.slice(0, 2));
        const rowsBefore = el._rows.length;
        el.appendData('bad');
        expect(el._rows.length).toBe(rowsBefore);
    });
});

// ─── setPageData ──────────────────────────────────────────────────────────────

describe('PaginationExtension.setPageData', () => {
    it('appends new page data without a page number', () => {
        const el = createGrid(schema, baseRows.slice(0, 3), { pageSize: 3, totalPages: 2 });
        el.setPageData([{ name: 'Page2-1' }, { name: 'Page2-2' }]);
        expect(el._rows.length).toBeGreaterThan(3);
    });

    it('replaces page slice when pageNumber is given', () => {
        const el = createGrid(schema, baseRows.slice(0, 6), { pageSize: 3, totalPages: 2 });
        el.setPageData([{ name: 'New-1' }, { name: 'New-2' }, { name: 'New-3' }], 2);
        expect(el._rows[3].name).toBe('New-1');
    });

    it('clears loading flag after update', () => {
        const el = createGrid(schema, baseRows.slice(0, 3), { pageSize: 3, totalPages: 2 });
        getPagExt(el)._loading = true;
        el.setPageData([{ name: 'P2' }]);
        expect(getPagExt(el)._loading).toBe(false);
    });

    it('is a no-op for non-array input', () => {
        const el = createGrid(schema, baseRows.slice(0, 2));
        const rowsBefore = el._rows.length;
        el.setPageData(null);
        expect(el._rows.length).toBe(rowsBefore);
    });
});

// ─── resetPaginationState (called via setData) ────────────────────────────────

describe('PaginationExtension reset via setData', () => {
    it('resets _currentPage to 1 after setData', () => {
        const el = createGrid(schema, baseRows, { pageSize: 3, totalPages: 4 });
        const pagExt = getPagExt(el);
        pagExt._currentPage = 3;

        el.setData(baseRows.slice(0, 3));

        expect(pagExt._currentPage).toBe(1);
    });

    it('clears _endReached after setData', () => {
        const el = createGrid(schema, baseRows, { pageSize: 3, totalPages: 2 });
        const pagExt = getPagExt(el);
        pagExt._endReached = true;

        el.setData(baseRows.slice(0, 3));

        expect(pagExt._endReached).toBe(false);
    });
});

// ─── _checkThresholdTrigger ───────────────────────────────────────────────────
// Signature: _checkThresholdTrigger(currentPage, visibleEndIndex)
// where visibleEndIndex is the absolute row index of the last visible row

describe('PaginationExtension._checkThresholdTrigger', () => {
    function setupThreshold(options = {}) {
        const el = createGrid(schema, baseRows, { pageSize: 10, totalPages: 3, ...options });
        const pagExt = getPagExt(el);
        // Ensure clean state for all threshold tests
        pagExt._pageSize = 10;
        pagExt._currentPage = 1;
        pagExt._loading = false;
        pagExt._endReached = false;
        pagExt._lastTriggeredPage = 0;
        return { el, pagExt };
    }

    it('fires swivel:pageThreshold when visibleEnd >= 80% of page size', () => {
        const { el, pagExt } = setupThreshold();
        const events = [];
        el.addEventListener('swivel:pageThreshold', e => events.push(e));

        pagExt._checkThresholdTrigger(1, 9); // page 1, row 9 of 10 = 90% → triggers

        expect(events).toHaveLength(1);
    });

    it('does NOT fire when visibleEnd < 80%', () => {
        const { el, pagExt } = setupThreshold();
        const events = [];
        el.addEventListener('swivel:pageThreshold', e => events.push(e));

        pagExt._checkThresholdTrigger(1, 5); // page 1, row 5 of 10 = 50% → no trigger

        expect(events).toHaveLength(0);
    });

    it('does NOT fire when loading is true', () => {
        const { el, pagExt } = setupThreshold();
        pagExt._loading = true;
        const events = [];
        el.addEventListener('swivel:pageThreshold', e => events.push(e));

        pagExt._checkThresholdTrigger(1, 9);

        expect(events).toHaveLength(0);
    });

    it('does NOT fire when _endReached is true', () => {
        const { el, pagExt } = setupThreshold();
        pagExt._endReached = true;
        const events = [];
        el.addEventListener('swivel:pageThreshold', e => events.push(e));

        pagExt._checkThresholdTrigger(1, 9);

        expect(events).toHaveLength(0);
    });
});

// ─── Load-more section ────────────────────────────────────────────────────────

describe('PaginationExtension load-more section', () => {
    it('renders load-more section when totalPages is set and current page < total', () => {
        const el = createGrid(schema, baseRows.slice(0, 3), { pageSize: 3, totalPages: 3, layoutType: 'table' });
        expect(el.shadowRoot.querySelector('.load-more-section')).not.toBeNull();
    });

    it('does NOT render load-more section when totalPages is not set', () => {
        const el = createGrid(schema, baseRows.slice(0, 3), { layoutType: 'table' });
        expect(el.shadowRoot.querySelector('.load-more-section')).toBeNull();
    });

    it('shows spinner when loading is true', () => {
        const el = createGrid(schema, baseRows.slice(0, 3), { pageSize: 3, totalPages: 3, layoutType: 'table' });
        getPagExt(el)._loading = true;
        el.render();
        expect(el.shadowRoot.querySelector('.spinner')).not.toBeNull();
    });

    it('shows load-more button when loadMoreCallback set and not loading', () => {
        const el = createGrid(schema, baseRows.slice(0, 3), { pageSize: 3, totalPages: 3, layoutType: 'table' });
        el.loadMoreCallback = vi.fn();
        el.render();
        expect(el.shadowRoot.querySelector('.load-more-button')).not.toBeNull();
    });

    it('calls loadMoreCallback when button is clicked', () => {
        const el = createGrid(schema, baseRows.slice(0, 3), { pageSize: 3, totalPages: 3, layoutType: 'table' });
        const callback = vi.fn();
        el.loadMoreCallback = callback;
        el.render();
        el.shadowRoot.querySelector('#load-more-btn').click();
        expect(callback).toHaveBeenCalledTimes(1);
    });
});
