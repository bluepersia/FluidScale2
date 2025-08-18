import {
  DeepReadonly,
  FluidRangeMetaData,
  FluidRangesByAnchor,
  IFluidBreakpointRange,
} from "../index.types";
import { FluidProperty } from "./fluidProperty";

export interface IConfig {}

export interface IState {
  fluidRangesByAnchor: DeepReadonly<FluidRangesByAnchor>;
  breakpoints: readonly number[];
  stableWindowWidth: number;
  stableWindowHeight: number;
  isMutationObserverInitialized: boolean;
  isIntersectionObserverInitialized: boolean;
}

export interface IFluidProperty {
  metaData: FluidRangeMetaData;
  state: FluidPropertyState;
  update(breakpoints: number[]): void;
}

export type FluidPropertyState = {
  property: string;
  value: string;
  fluidProperty: FluidProperty | null;
  orderID: number;
  calcedSizePercentEl?: HTMLElement;
  /** We keep track of the last applied state, to avoid re-computing the value if the width didn't change */
  appliedState?: AppliedFluidPropertyState;
};

export type AppliedFluidPropertyState = {
  value: string;
  fluidProperty: FluidProperty;
  orderID: number;
  calcedSizePercentEl?: HTMLElement;
};

export type FluidPropertyConfig = {
  el: HTMLElement;
  metaData: FluidRangeMetaData;
  fluidBreakpoints: (IFluidBreakpointRange | null)[];
};

export type ComputationParamsBase = Readonly<{
  progress: number;
  fluidRange: IFluidBreakpointRange;
}>;

export type ComputationParams = ComputationParamsBase &
  Readonly<{
    el: HTMLElement;
    property: string;
  }>;

export type InsertFluidPropertyParams = Readonly<{
  el: HTMLElement;
  metaData: FluidRangeMetaData;
  fluidRanges: readonly DeepReadonly<IFluidBreakpointRange>[];
  breakpoints: readonly number[];
}>;
