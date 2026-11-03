import { describe, it, expect, vi } from 'vitest';
import { createGrid, createGridWithExtensions } from '../setup.js';

const schema = [{ key: 'name', label: 'Name' }];
const rows = [{ name: 'Alpha' }, { name: 'Beta' }];

// ─── addExtensionStyles / removeExtensionStyles ───────────────────────────────

describe('addExtensionStyles', () => {
    it('injects a <style> tag into shadow DOM with data-extension-id', () => {
        const el = createGrid(schema, rows);
        el.addExtensionStyles('td { color: red; }', 'my-ext');
        const style = el.shadowRoot.querySelector('style[data-extension-id="my-ext"]');
        expect(style).not.toBeNull();
        expect(style.textContent).toContain('color: red');
    });

    it('returns true on success', () => {
        const el = createGrid(schema, rows);
        expect(el.addExtensionStyles('td {}', 'ext-a')).toBe(true);
    });

    it('replaces an existing style with the same ID', () => {
        const el = createGrid(schema, rows);
        el.addExtensionStyles('td { color: red; }', 'ext-b');
        el.addExtensionStyles('td { color: blue; }', 'ext-b');
        const styles = el.shadowRoot.querySelectorAll('style[data-extension-id="ext-b"]');
        expect(styles).toHaveLength(1);
        expect(styles[0].textContent).toContain('blue');
    });

    it('returns false when shadowRoot is null', () => {
        const el = createGrid(schema, rows);
        Object.defineProperty(el, 'shadowRoot', { get: () => null, configurable: true });
        expect(el.addExtensionStyles('td {}', 'x')).toBe(false);
    });
});

describe('removeExtensionStyles', () => {
    it('removes the style element with the given ID', () => {
        const el = createGrid(schema, rows);
        el.addExtensionStyles('td {}', 'ext-c');
        el.removeExtensionStyles('ext-c');
        expect(el.shadowRoot.querySelector('style[data-extension-id="ext-c"]')).toBeNull();
    });

    it('returns true when style was found and removed', () => {
        const el = createGrid(schema, rows);
        el.addExtensionStyles('td {}', 'ext-d');
        expect(el.removeExtensionStyles('ext-d')).toBe(true);
    });

    it('returns false when no matching style exists', () => {
        const el = createGrid(schema, rows);
        expect(el.removeExtensionStyles('no-such-id')).toBe(false);
    });
});

// ─── addExtensionEventListener / cleanupExtensionEventListeners ───────────────

describe('addExtensionEventListener', () => {
    it('listens to events on the element', () => {
        const el = createGrid(schema, rows);
        const handler = vi.fn();
        el.addExtensionEventListener('swivel:sort', handler, 'test-ext');

        el.dispatchEvent(new CustomEvent('swivel:sort', { detail: { key: 'name' } }));
        expect(handler).toHaveBeenCalledTimes(1);
    });

    it('returns a cleanup function that stops listening', () => {
        const el = createGrid(schema, rows);
        const handler = vi.fn();
        const cleanup = el.addExtensionEventListener('swivel:data', handler, 'test-ext2');

        cleanup();
        el.dispatchEvent(new CustomEvent('swivel:data', {}));
        expect(handler).not.toHaveBeenCalled();
    });

    it('does not propagate errors thrown by handler (wraps in try/catch)', () => {
        const el = createGrid(schema, rows);
        el.addExtensionEventListener('swivel:sort', () => { throw new Error('boom'); }, 'bad-ext');
        expect(() => {
            el.dispatchEvent(new CustomEvent('swivel:sort', {}));
        }).not.toThrow();
    });
});

describe('cleanupExtensionEventListeners', () => {
    it('removes all listeners registered under the given extension name', () => {
        const el = createGrid(schema, rows);
        const h1 = vi.fn();
        const h2 = vi.fn();
        el.addExtensionEventListener('swivel:sort', h1, 'cleanup-ext');
        el.addExtensionEventListener('swivel:data', h2, 'cleanup-ext');

        el.cleanupExtensionEventListeners('cleanup-ext');

        el.dispatchEvent(new CustomEvent('swivel:sort', {}));
        el.dispatchEvent(new CustomEvent('swivel:data', {}));
        expect(h1).not.toHaveBeenCalled();
        expect(h2).not.toHaveBeenCalled();
    });

    it('is a no-op when called for an unknown extension', () => {
        const el = createGrid(schema, rows);
        expect(() => el.cleanupExtensionEventListeners('ghost-ext')).not.toThrow();
    });
});

// ─── Hook execution order (priority) ─────────────────────────────────────────

describe('beforeRender hook execution order', () => {
    it('hooks fire in ascending priority order (lower number first)', () => {
        const el = document.createElement('swivel-grid');
        document.body.appendChild(el);

        const order = [];

        const extHigh = new BaseExtension('high');
        extHigh.priority = 100;
        extHigh.onBeforeRender = (ctx) => { order.push('high'); return ctx; };

        const extLow = new BaseExtension('low');
        extLow.priority = 1;
        extLow.onBeforeRender = (ctx) => { order.push('low'); return ctx; };

        el.registerExtension(extHigh);
        el.registerExtension(extLow);

        el.schema = schema;
        el.rows = [...rows];

        expect(order[0]).toBe('low');
        expect(order[1]).toBe('high');
    });
});

// ─── unregisterExtension lifecycle ────────────────────────────────────────────

describe('unregisterExtension lifecycle', () => {
    it('calls destroy() on the extension', () => {
        const el = createGrid(schema, rows);
        const ext = new BaseExtension('lifecycle-ext');
        const destroySpy = vi.fn();
        ext.onDestroy = destroySpy;

        el.registerExtension(ext);
        el.unregisterExtension('lifecycle-ext');

        expect(destroySpy).toHaveBeenCalledTimes(1);
    });

    it('removes extension from hooks after unregister', () => {
        const el = createGrid(schema, rows);
        const ext = new BaseExtension('hooks-ext');
        const hookSpy = vi.fn((ctx) => ctx);
        ext.onBeforeRender = hookSpy;

        el.registerExtension(ext);
        el.unregisterExtension('hooks-ext');

        el.schema = schema;
        el.rows = [...rows];

        expect(hookSpy).not.toHaveBeenCalled();
    });
});

// ─── swapExtension ────────────────────────────────────────────────────────────

describe('SwivelGrid.swapExtension', () => {
    it('replaces an existing extension by name', () => {
        const el = createGrid(schema, rows);
        const newSorting = new SortingExtension();
        el.swapExtension('sorting', newSorting);
        expect(el.hasExtension('sorting')).toBe(true);
        expect(el.getExtension('sorting')).toBe(newSorting);
    });

    it('calls destroy() on the old extension', () => {
        const el = createGrid(schema, rows);
        const oldExt = el.getExtension('sorting');
        const destroySpy = vi.spyOn(oldExt, 'destroy');
        el.swapExtension('sorting', new SortingExtension());
        expect(destroySpy).toHaveBeenCalledTimes(1);
    });

    it('works when no extension with that name is registered (just registers new)', () => {
        const el = createGridWithExtensions(schema, rows, []);
        const ext = new LayoutRendererExtension();
        const result = el.swapExtension('layout-renderer', ext);
        expect(result).toBe(true);
        expect(el.hasExtension('layout-renderer')).toBe(true);
    });

    it('returns true on successful swap', () => {
        const el = createGrid(schema, rows);
        const result = el.swapExtension('sorting', new SortingExtension());
        expect(result).toBe(true);
    });

    it('grid remains functional after swap', () => {
        const el = createGrid(schema, rows, { layoutType: 'table' });
        el.swapExtension('sorting', new SortingExtension());
        el.render();
        expect(el.shadowRoot.querySelector('tbody tr')).not.toBeNull();
    });
});

// ─── toggleExtension ──────────────────────────────────────────────────────────

describe('SwivelGrid.toggleExtension', () => {
    it('disables an extension', () => {
        const el = createGrid(schema, rows);
        el.toggleExtension('sorting', false);
        expect(el.getExtension('sorting').enabled).toBe(false);
    });

    it('re-enables a disabled extension', () => {
        const el = createGrid(schema, rows);
        el.toggleExtension('sorting', false);
        el.toggleExtension('sorting', true);
        expect(el.getExtension('sorting').enabled).toBe(true);
    });

    it('returns true when extension is found', () => {
        const el = createGrid(schema, rows);
        expect(el.toggleExtension('sorting', false)).toBe(true);
    });

    it('returns false for unknown extension name', () => {
        const el = createGrid(schema, rows);
        expect(el.toggleExtension('does-not-exist', false)).toBe(false);
    });

    it('does not re-render when rerender=false', () => {
        const el = createGrid(schema, rows);
        const renderSpy = vi.spyOn(el, 'render');
        el.toggleExtension('sorting', false, false);
        expect(renderSpy).not.toHaveBeenCalled();
    });

    it('triggers a re-render by default', () => {
        const el = createGrid(schema, rows);
        const renderSpy = vi.spyOn(el, 'render');
        el.toggleExtension('sorting', false);
        expect(renderSpy).toHaveBeenCalledTimes(1);
    });
});

// ─── Default state ────────────────────────────────────────────────────────────

describe('Initial extension state', () => {
    it('_extensions is a Map', () => {
        const el = document.createElement('swivel-grid');
        document.body.appendChild(el);
        expect(el._extensions).toBeInstanceOf(Map);
    });

    it('_extensionHooks has beforeRender and afterRender arrays', () => {
        const el = document.createElement('swivel-grid');
        document.body.appendChild(el);
        expect(Array.isArray(el._extensionHooks.beforeRender)).toBe(true);
        expect(Array.isArray(el._extensionHooks.afterRender)).toBe(true);
    });

    it('empty grid has no extensions', () => {
        const el = document.createElement('swivel-grid');
        document.body.appendChild(el);
        expect(el.listExtensions()).toHaveLength(0);
    });
});
