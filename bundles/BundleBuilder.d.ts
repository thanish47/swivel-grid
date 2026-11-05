import type { BaseExtension } from '../extensions/BaseExtension.d.ts';

export declare class BundleBuilder {
    constructor();

    addFeature(name: string, config?: Record<string, unknown>): this;
    removeFeature(name: string): this;
    withConfig(featureName: string, config: Record<string, unknown>): this;
    hasFeature(name: string): boolean;

    resolveDependencies(): { resolved: string[]; added: string[] };
    validate(): { valid: boolean; errors: string[] };
    estimateSize(): { kb: number; breakdown: Record<string, number> };
    build(): BaseExtension[];

    toConfig(): { version: 1; features: Array<{ name: string; config?: Record<string, unknown> }> };
    static fromConfig(configObj: { version: number; features: Array<{ name: string; config?: Record<string, unknown> }> }): BundleBuilder;
    static fromPreset(presetName: 'table-focused' | 'designer' | 'data-heavy' | 'minimal-interactive' | 'dashboard' | 'enterprise'): BundleBuilder;
}

export default BundleBuilder;
