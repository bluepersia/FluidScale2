import { FluidPropertyState, IFluidProperty } from "./engine/engine.types";

type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

declare global {
  interface HTMLElement {
    fluidProperties?: IFluidProperty[];
    isFluid?: boolean;
    states?: FluidPropertyState[];
    statesByProperty?: { [property: string]: FluidPropertyState };
    isVisible?: boolean;
    visibleAtScrollPosition: [number, number];
    updateTime?: number;
    updateWidth?: number;
    mainFluidProperties?: { [property: string]: IFluidProperty };
    inlineStylesChanged?: boolean;
    isResized?: boolean;
    isObservingResize?: boolean;
    /** Temporary storage for the target parent of a percent calculation */
    calcedSizePercentEl?: HTMLElement;
    inlineStyleBatches?: Record<string, string>[];
    bgImageSizes?: ([number, number] | "loading")[];
  }
}

interface IFluidRangeComputation {
  minValue: IFluidValue | (IFluidValue | ",")[];
  maxValue: IFluidValue | (IFluidValue | ",")[];
  locks?: number[] | "all";
  valueIndexMap?: Map<number, number>;
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
  value: number | Function | string;
  unit: string | FunctionUnits | string;
}

type ParsedDocument = Readonly<{
  fluidRangesByAnchor: FluidRangesByAnchor;
  breakpoints: number[];
}>;

type FluidRangesByAnchor = {
  [anchor: string]: FluidRangesBySelector;
};

type FluidRangesBySelector = {
  [selector: string]: {
    [property: string]: FluidPropertyData;
  };
};

type FluidPropertyData = [Omit<FluidRangeMetaData, "property">, IFluidRange[]];

type Function = {
  type: FunctionType | GraphicsFunctionType;
  values: (number | Function | Exclude<string, "none">)[];
};
type FunctionUnits = {
  units: (string | FunctionUnits)[];
};

type FunctionType = "calc" | "min" | "max" | "clamp" | "minmax";

type GraphicsFunctionType =
  | "translate"
  | "translateX"
  | "translateY"
  | "translateZ"
  | "rotate"
  | "rotateX"
  | "rotateY"
  | "rotateZ"
  | "skew"
  | "skewX"
  | "skewY"
  | "scale"
  | "scaleX"
  | "scaleY"
  | "scaleZ";

export type {
  Expand,
  IFluidRangeComputation,
  IFluidRange,
  FluidRangeMetaData,
  IFluidValue,
  ParsedDocument,
  FluidRangesByAnchor,
  Function,
  FunctionUnits,
  FluidPropertyData,
};
