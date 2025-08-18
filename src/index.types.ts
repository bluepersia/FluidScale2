import { FluidPropertyState, IFluidProperty } from "./engine/engine.types";

export type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

export type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends (...args: any[]) => any // if it's a method, keep as-is
    ? T[K]
    : T[K] extends object // if it's an object, recurse
    ? DeepReadonly<T[K]>
    : T[K]; // primitive stays the same
};

export type DeepReadonlyExcept<T, K extends keyof any> = {
  [P in keyof T]: P extends K
    ? T[P] // excluded field → keep as-is
    : T[P] extends (...args: any[]) => any // methods → keep as-is
    ? T[P]
    : T[P] extends object // recurse for objects
    ? DeepReadonlyExcept<T[P], K>
    : T[P];
} & {};

declare global {
  interface HTMLElement {
    fluidProperties?: IFluidProperty[];
    states?: FluidPropertyState[];
    statesByProperty?: { [property: string]: FluidPropertyState };
    isHidden?: boolean;
    visibleAtScrollPosition: [number, number];
    updateTime?: number;
    updateWidth?: number;
    mainFluidProperties?: { [property: string]: IFluidProperty };
    inlineStylesChanged?: boolean;
    isResized?: boolean;
    isObservingResize?: boolean;
    /** Temporary storage for the target parent of a percent calculation */
    calcedSizePercentEl?: HTMLElement;
  }
}

/** A span of 2 breakpoints, from min to max */
export interface IFluidBreakpointRange {
  minValue: IFluidValue | IFluidValue[];
  maxValue: IFluidValue | IFluidValue[];
  minIndex: number;
  maxIndex: number;
}
/** Data about a set of fluid breakpoint ranges for a given selector.*/
export type FluidRangeMetaData = {
  property: string;
  orderID: number;
  dynamicSelector?: string;
};

export interface IFluidValue {
  value: number | Calc | string;
  unit: string | CalcUnits | string;
}

export type ParsedDocument = DeepReadonly<{
  fluidRangesByAnchor: FluidRangesByAnchor;
  breakpoints: number[];
}>;

export type FluidRangesByAnchor = {
  [anchor: string]: FluidRangesBySelector;
};
export type FluidRangesBySelector = {
  [selector: string]: [FluidRangeMetaData, IFluidBreakpointRange[]];
};

export type Calc = {
  type: "calc" | "min" | "max" | "clamp" | "minmax";
  values: (number | Calc | string)[];
};
export type CalcUnits = {
  units: (string | CalcUnits)[];
};
