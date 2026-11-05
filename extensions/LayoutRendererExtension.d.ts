import type { BaseExtension } from './BaseExtension.d.ts';
import type { SchemaColumn } from '../types.d.ts';

export declare class LayoutRendererExtension extends BaseExtension {
    constructor();
    renderCellContent(value: unknown, column: SchemaColumn, isGridImage?: boolean, row?: Record<string, unknown> | null): string;
    renderAppendedRows(newRows: Record<string, unknown>[], layoutType: string, schema: SchemaColumn[]): void;
}

export default LayoutRendererExtension;
