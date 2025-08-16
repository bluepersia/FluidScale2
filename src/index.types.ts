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
  value: number | Calc;
  unit: string | CalcUnits;
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
  values: (number | Calc)[];
};
export type CalcUnits = {
  units: (string | CalcUnits)[];
};
