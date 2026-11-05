export interface SchemaColumn {
    key: string;
    label: string;
    sort?: 'ASC' | 'DESC';
    sortable?: boolean;
    /** @deprecated Use cellTemplate instead */
    type?: string;
    cellTemplate?: string;
    headerTemplate?: string;
    cellClass?: string | ((value: unknown, row: Record<string, unknown>) => string);
    headerClass?: string;
    rowClass?: string | ((row: Record<string, unknown>) => string);
    className?: string;
    columnClass?: string;
    minWidth?: string;
    maxWidth?: string;
    width?: string;
    sortComparator?: (a: unknown, b: unknown, rowA: Record<string, unknown>, rowB: Record<string, unknown>) => number;
}

export interface GridState {
    schema: SchemaColumn[];
    rows: Record<string, unknown>[];
    layoutType: 'grid' | 'table';
    searchInput: string | null;
    loading?: boolean;
    currentPage?: number;
    pageSize?: number;
    totalPages?: number | null;
}

export interface RenderContext extends GridState {
    layoutHTML?: string;
    loadMoreHTML?: string;
}

export interface SwivelSortDetail { key: string; direction: 'ASC' | 'DESC'; }
export interface SwivelSearchDetail { query: string; }
export interface SwivelDataDetail { type: 'set' | 'page-set' | 'page-append' | 'append'; length: number; pageNumber?: number; added?: number; }
export interface SwivelPageDetail { pageNumber: number; }
export interface SwivelPageThresholdDetail { currentPage: number; visibleEndIndex: number; }
export interface SwivelVirtualizationDetail { visibleRange: { start: number; end: number }; renderCount: number; lastRenderTime: number; }
