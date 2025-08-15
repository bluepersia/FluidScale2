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

export interface IParseStylesheetStateBase {
  batches: StyleBatch[];
  fluidRanges: IFluidRange[];
}

export interface IParseStylesheetState extends IParseStylesheetStateBase {
  index: number;
  batch: StyleBatch;
}

export interface IFluidRange {
  minValue: IFluidValue;
  maxValue: IFluidValue;
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
