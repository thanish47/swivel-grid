import type { BaseExtension } from './BaseExtension.d.ts';

export declare class SearchExtension extends BaseExtension {
    constructor();
    bindSearchInput(selector?: string | null): void;
    unbindSearchInput(): void;
    handleSearch(query: string): void;
    getCurrentQuery(): string;
    setSearchQuery(query: string): void;
    clearSearch(): void;
    isSearchInputBound(): boolean;
    filterData(data: Record<string, unknown>[], query: string, columns?: string[] | null): Record<string, unknown>[];
    createSearchInput(options?: Record<string, unknown>): HTMLElement;
}

export default SearchExtension;
