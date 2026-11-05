import type { BaseExtension } from './BaseExtension.d.ts';
import type { SchemaColumn } from '../types.d.ts';

export declare class CssClassesExtension extends BaseExtension {
    constructor();
    applyCellClass(content: string, column: SchemaColumn, value: unknown, row: Record<string, unknown>): string;
    applyHeaderClass(content: string, column: SchemaColumn): string;
    applyRowClass(row: Record<string, unknown>, rowIndex: number): string;
    validateClassName(className: string): { isValid: boolean; errors: string[] };
}

export default CssClassesExtension;
