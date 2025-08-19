import { FluidPropertyState, IFluidProperty } from "./engine/engine.types";

type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

/** Makes an object immutable. */
type f<T> = {
  readonly [K in keyof T]: T[K] extends (...args: any[]) => any // if it's a method, keep as-is
    ? T[K]
    : T[K] extends object // if it's an object, recurse
    ? f<T[K]>
    : T[K]; // primitive stays the same
};

type DM<T> = T extends (...args: any[]) => any
  ? T // leave functions alone
  : T extends ReadonlyArray<infer U> // handle arrays
  ? DMArray<U>
  : T extends object
  ? { -readonly [K in keyof T]: DM<T[K]> }
  : T;

interface DMArray<T> extends Array<DM<T>> {}

declare global {
  interface HTMLElement {
    fluidProperties?: IFluidProperty[];
    isFluid?: boolean;
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

interface IFluidRangeComputation {
  minValue: IFluidValue | IFluidValue[];
  maxValue: IFluidValue | IFluidValue[];
  locks?: number[] | "all";
}

/** A span of 2 breakpoints, from min to max */
interface IFluidRange extends IFluidRangeComputation {
  minIndex: number;
  maxIndex: number;
}

/** Data about a set of fluid breakpoint ranges for a given selector.*/
type FluidRangeMetaData = {
  property: string;
  orderID: number;
  dynamicSelector?: string;
};

interface IFluidValue {
  value: number | Calc | string;
  unit: string | CalcUnits | string;
}

type ParsedDocument = Readonly<{
  fluidRangesByAnchor: FluidRangesByAnchor;
  breakpoints: number[];
}>;

type FluidRangesByAnchor = {
  [anchor: string]: FluidRangesBySelector;
};

type FluidRangesBySelector = {
  [selector: string]: [FluidRangeMetaData, IFluidRange[]];
};

type Calc = {
  type: "calc" | "min" | "max" | "clamp" | "minmax";
  values: (number | Calc | string)[];
};
type CalcUnits = {
  units: (string | CalcUnits)[];
};

export type {
  Expand,
  f,
  IFluidRangeComputation,
  IFluidRange,
  FluidRangeMetaData,
  IFluidValue,
  ParsedDocument,
  FluidRangesByAnchor,
  Calc,
  CalcUnits,
  DM,
};
