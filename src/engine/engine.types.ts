import { FluidRangeMetaData, IFluidRange } from "../index.types";
import { FluidProperty } from "./fluidProperty";

export interface IFluidProperty {
  el: HTMLElement;
  fluidBreakpoints: (IFluidRange | null)[];
  metaData: FluidRangeMetaData;
  state: FluidPropertyState;
  update(): void;
}

export type FluidPropertyState = {
  property: string;
  value: string;
  appliedValue: string;
  appliedWidth: number;
  fluidProperty: FluidProperty | null;
  order: number;
};

export type FluidPropertyConfig = {
  el: HTMLElement;
  metaData: FluidRangeMetaData;
  fluidBreakpoints: (IFluidRange | null)[];
};

export interface IComputationStateBase {
  progress: number;
  fluidRange: IFluidRange;
  minBreakpoint: number;
  maxBreakpoint: number;
}

export interface IComputationState extends IComputationStateBase {
  el: HTMLElement;
  property: string;
}
