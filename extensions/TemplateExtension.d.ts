import type { BaseExtension } from './BaseExtension.d.ts';
import type { SchemaColumn } from '../types.d.ts';

export declare class TemplateExtension extends BaseExtension {
    constructor();
    renderTemplate(template: string, context: Record<string, unknown>): string;
    sanitizeTemplate(template: string): string | null;
    validateTemplate(template: string): { isValid: boolean; errors: string[] };
    renderRating(value: unknown, options?: {
        max?: number;
        starChar?: string;
        emptyChar?: string;
        showText?: boolean;
        showValue?: boolean;
    }): string;
    renderImage(value: unknown, options?: {
        isGridImage?: boolean;
        className?: string;
        width?: string;
        height?: string;
    }): string;
    formatDate(date: unknown, format?: 'short' | 'long' | 'iso'): string;
    formatNumber(number: unknown, decimals?: number): string;
    formatCurrency(amount: unknown, currency?: string): string;
    truncate(text: unknown, length?: number, suffix?: string): string;
    capitalize(text: unknown): string;
    processSchemaTemplates(schema: SchemaColumn[]): SchemaColumn[];
}

export default TemplateExtension;
