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
  allElements: Set<Element>;
  visibleElements: Set<HTMLElement>;
  pendingHiddenElements: Set<HTMLElement>;
}

interface IFluidProperty {
  metaData: FluidRangeMetaData;
  state: FluidPropertyState;
  update(): void;
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
};

type FluidPropertyConfig = Readonly<{
  el: HTMLElement;
  metaData: FluidRangeMetaData;
  fluidBreakpoints: (IFluidRange | null)[];
}>;

type ComputationParamsBase = Readonly<{
  progress: number;
  fluidRange: IFluidRangeComputation;
}>;

type ComputationParams = ComputationParamsBase &
  Readonly<{
    el: HTMLElement;
    property: string;
  }>;

type InsertFluidPropertyParams = Readonly<{
  el: HTMLElement;
  metaData: FluidRangeMetaData;
  fluidRanges: IFluidRange[];
  breakpoints: number[];
}>;

type InlineStyleController = {
  /** Undo the styles applied by this batch. This will apply the previous batch, if any. */
  undo: () => void;
};

export {
  IConfig,
  IState,
  IFluidProperty,
  FluidPropertyState,
  FluidPropertyConfig,
  ComputationParamsBase,
  ComputationParams,
  InsertFluidPropertyParams,
  InlineStyleController,
};
