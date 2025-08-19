import {
  FluidRangeMetaData,
  FluidRangesByAnchor,
  IFluidRange,
  IFluidRangeComputation,
} from "../index.types";
import { FluidProperty } from "./fluidProperty";

interface IConfig {}

interface IState {
  fluidRangesByAnchor: FluidRangesByAnchor;
  breakpoints: number[];
  stableWindowWidth: number;
  stableWindowHeight: number;
  isMutationObserverInitialized: boolean;
  isIntersectionObserverInitialized: boolean;
}

interface IFluidProperty {
  metaData: FluidRangeMetaData;
  state: FluidPropertyState;
  update(breakpoints: number[]): void;
}

type FluidPropertyState = {
  property: string;
  value: string;
  fluidProperty: FluidProperty | null;
  orderID: number;
  calcedSizePercentEl?: HTMLElement;
  /** We keep track of the last applied state, to avoid re-computing the value if the width didn't change */
  appliedState?: AppliedFluidPropertyState;
};

type AppliedFluidPropertyState = {
  value: string;
  fluidProperty: FluidProperty;
  orderID: number;
  calcedSizePercentEl?: HTMLElement;
  windowWidth: number;
};

type FluidPropertyConfig = Readonly<{
  el: HTMLElement;
  metaData: FluidRangeMetaData;
  fluidBreakpoints: (IFluidRange | null)[];
}>;

type ComputationParamsBase = Pick<IState, "breakpoints"> &
  Readonly<{
    progress: number;
    fluidRange: IFluidRangeComputation;
  }>;

type ComputationParams = ComputationParamsBase &
  Readonly<{
    el: HTMLElement;
    property: string;
  }>;

type ValueArrayParams = Readonly<{
  minValuePx: number | number[];
  maxValuePx: number | number[];
  progress: number;
  locks?: number[] | undefined;
}>;

type InsertFluidPropertyParams = Readonly<{
  el: HTMLElement;
  metaData: FluidRangeMetaData;
  fluidRanges: IFluidRange[];
  breakpoints: number[];
}>;

export {
  IConfig,
  IState,
  IFluidProperty,
  FluidPropertyState,
  FluidPropertyConfig,
  ComputationParamsBase,
  ComputationParams,
  ValueArrayParams,
  InsertFluidPropertyParams,
};
