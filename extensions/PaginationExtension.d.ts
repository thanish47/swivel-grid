import type { BaseExtension } from './BaseExtension.d.ts';

export declare class PaginationExtension extends BaseExtension {
    constructor();
    getPaginationState(): {
        currentPage: number;
        pageSize: number;
        totalPages: number | null;
        loading: boolean;
        endReached: boolean;
    };
    resetPaginationState(): void;
}

export default PaginationExtension;
