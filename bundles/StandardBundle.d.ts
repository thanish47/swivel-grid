import type { SwivelGrid } from '../SwivelGrid.d.ts';

export declare class StandardBundle {
    static loadInto(grid: SwivelGrid, options?: { verbose?: boolean }): Promise<{
        success: boolean;
        loadedExtensions: string[];
        errors: string[];
    }>;
}

export default StandardBundle;
