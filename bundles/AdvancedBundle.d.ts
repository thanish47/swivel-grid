import type { SwivelGrid } from '../SwivelGrid.d.ts';

export declare class AdvancedBundle {
    static loadInto(grid: SwivelGrid, options?: { verbose?: boolean }): Promise<{
        success: boolean;
        loadedExtensions: string[];
        errors: string[];
    }>;
}

export default AdvancedBundle;
