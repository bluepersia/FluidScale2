import { FluidPropertyState, IFluidProperty } from "./engine/engine.types";

declare global {
  interface HTMLElement {
    fluidProperties?: IFluidProperty[];
    states?: FluidPropertyState[];
    statesByProperty?: { [property: string]: FluidPropertyState };
    isHidden?: boolean;
    updateTime?: number;
  }
}

export interface IFluidRange {
  minValue: IFluidValue | IFluidValue[];
  maxValue: IFluidValue | IFluidValue[];
  breakpointIndex: number;
  nextBreakpointIndex: number;
}
export type FluidRangeMetaData = {
  property: string;
  order: number;
};

export interface IFluidValue {
  value: number | Calc | string;
  unit: string | CalcUnits | string;
}

export type ParsedDocument = {
  fluidRangesByAnchor: FluidRangesByAnchor;
  breakpoints: number[];
};

export type FluidRangesByAnchor = {
  [anchor: string]: FluidRangesBySelector;
};
export type FluidRangesBySelector = {
  [selector: string]: [FluidRangeMetaData, IFluidRange[]];
};

export type Calc = {
  type: "calc" | "min" | "max" | "clamp" | "minmax";
  values: (number | Calc | string)[];
};
export type CalcUnits = {
  units: (string | CalcUnits)[];
};
