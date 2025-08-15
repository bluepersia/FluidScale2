export type StyleBatch = {
  width: number;
  isMediaQuery: boolean;
  rules: CSSRule[];
};

export interface IBatchState {
  currentBatch: StyleBatch | null;
  batches: StyleBatch[];
}

export interface IBatchStyleRuleState extends IBatchState {
  baselineWidth: number;
}

export interface IProcessStyleRuleStateBase {
  batches: StyleBatch[];
  fluidRanges: IFluidRange[];
}

export interface IProcessStyleRuleState extends IProcessStyleRuleStateBase {
  index: number;
  batch: StyleBatch;
  rule: CSSStyleRule;
}

export interface IFluidRange {
  minValue: IFluidValue | IFluidValue[];
  maxValue: IFluidValue | IFluidValue[];
  property: string;
  selectorText: string;
}

export interface IFluidValue {
  value: number;
  unit: string;
}

export interface IGetMaxValueParams {
  index: number;
  batches: StyleBatch[];
  batch: StyleBatch;
  property: string;
}
