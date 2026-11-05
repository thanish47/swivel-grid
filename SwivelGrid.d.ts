import type { SchemaColumn, SwivelSortDetail } from './types.d.ts';
import type { BaseExtension } from './extensions/BaseExtension.d.ts';

export declare class SwivelGrid extends HTMLElement {
    static readonly observedAttributes: ['layout-type', 'schema', 'rows', 'search-input'];

    schema: SchemaColumn[];
    rows: Record<string, unknown>[];
    layoutType: 'grid' | 'table';
    searchInput: string | null;

    sortHandler: ((detail: SwivelSortDetail) => void) | null;
    searchHandler: ((query: string) => void) | null;

    // Extension management
    registerExtension(extension: BaseExtension): boolean;
    unregisterExtension(extensionName: string): boolean;
    getExtension(extensionName: string): BaseExtension | null;
    hasExtension(extensionName: string): boolean;
    listExtensions(): string[];
    swapExtension(name: string, newExtensionInstance: BaseExtension): boolean;
    toggleExtension(name: string, enabled: boolean, rerender?: boolean): boolean;

    // Style injection
    addExtensionStyles(css: string, id: string): boolean;
    removeExtensionStyles(id: string): boolean;

    // Event helpers
    addExtensionEventListener(eventName: string, handler: (e: Event) => void, extensionName: string): () => void;
    cleanupExtensionEventListeners(extensionName: string): void;

    // Data methods
    setData(rows: Record<string, unknown>[]): void;
    appendData(rows: Record<string, unknown>[]): void;
    setPageData(data: Record<string, unknown>[], pageNumber?: number): void;

    // Pagination properties (available after PaginationExtension is registered)
    pageSize: number;
    totalPages: number | null;
    loading: boolean;
    loadMoreCallback: (() => void) | null;
    pageUpHandler: ((detail: { pageNumber: number }) => void) | null;
    pageDownHandler: ((detail: { pageNumber: number }) => void) | null;

    getDOMElements(): { tbody: HTMLElement | null; gridContainer: HTMLElement | null };

    render(): void;
    destroy(): void;
}

export { SwivelGrid as default };
