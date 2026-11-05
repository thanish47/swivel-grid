import type { GridState, RenderContext } from '../types.d.ts';

export declare class BaseExtension {
    readonly name: string;
    enabled: boolean;
    priority: number;

    constructor(name: string);

    onInitialize(gridInstance: import('../SwivelGrid.d.ts').SwivelGrid): void;
    onBeforeRender(context: RenderContext): RenderContext;
    onAfterRender(context: RenderContext, renderedElement: ShadowRoot): void;
    onDestroy(): void;

    initialize(gridInstance: import('../SwivelGrid.d.ts').SwivelGrid): void;
    beforeRender(context: RenderContext): RenderContext;
    afterRender(context: RenderContext, renderedElement: ShadowRoot): void;
    destroy(): void;

    setEnabled(enabled: boolean): void;
    setPriority(priority: number): void;
    getGrid(): import('../SwivelGrid.d.ts').SwivelGrid | null;
    getGridState(): GridState;
    dispatchEvent(eventName: string, detail?: Record<string, unknown>): void;
}

export default BaseExtension;
