import { FluidRangesByAnchor, IFluidValue } from "../index.types";

export type StyleBatch = {
  width: number;
  isMediaQuery: boolean;
  rules: CSSRule[];
};

export interface IParseStylesheetState {
  breakpoints: number[];
  globalBaselineWidth: number;
  fluidRangesByAnchor: FluidRangesByAnchor;
  order: number;
}

export interface IBatchState {
  currentBatch: StyleBatch | null;
  batches: StyleBatch[];
}

export interface IBatchStyleRuleState extends IBatchState {
  baselineWidth: number;
}

export interface IProcessStyleRuleStateBase {
  batches: StyleBatch[];
  fluidRangesByAnchor: FluidRangesByAnchor;
  breakpoints: number[];
}

export interface IProcessStyleRuleState extends IProcessStyleRuleStateBase {
  index: number;
  batch: StyleBatch;
  rule: CSSStyleRule;
  order: number;
}

export interface IProcessSelectorState extends IProcessStyleRuleState {
  selector: string;
  property: string;
  rule: CSSStyleRule;
}

export interface IGetFluidRangesState {
  selector: string;
  property: string;
  fluidRangesByAnchor: FluidRangesByAnchor;
  order: number;
}

export interface IGetMaxValueParams {
  index: number;
  batches: StyleBatch[];
  batch: StyleBatch;
  property: string;
  selector: string;
  fluidRangesByAnchor: FluidRangesByAnchor;
  isEligibleForSingleValue: boolean;
  minValue: IFluidValue | IFluidValue[];
}
