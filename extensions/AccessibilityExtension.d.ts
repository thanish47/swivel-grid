import type { BaseExtension } from './BaseExtension.d.ts';

export declare class AccessibilityExtension extends BaseExtension {
    constructor();
    generateARIAId(prefix?: string): string;
    getAccessibilityConfig(): Record<string, unknown>;
}

export default AccessibilityExtension;
