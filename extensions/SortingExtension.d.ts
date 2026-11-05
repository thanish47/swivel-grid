import type { BaseExtension } from './BaseExtension.d.ts';
import type { SchemaColumn } from '../types.d.ts';

export declare class SortingExtension extends BaseExtension {
    constructor();
    getSortClass(column: SchemaColumn): string;
    handleSort(key: string): void;
    sortData(key: string, direction: 'ASC' | 'DESC', customComparator?: (a: unknown, b: unknown, rowA: Record<string, unknown>, rowB: Record<string, unknown>) => number): void;
    getActiveSort(): SchemaColumn | null;
    setSortColumn(key: string, direction: 'ASC' | 'DESC', render?: boolean): boolean;
    clearSort(render?: boolean): void;
    isSortingAvailable(): boolean;
}

export default SortingExtension;
