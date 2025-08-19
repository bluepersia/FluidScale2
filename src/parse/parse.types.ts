import {
  Expand,
  FluidRangesByAnchor,
  IFluidRange,
  IFluidValue,
} from "../index.types";

type StyleBatch = {
  width: number;
  isMediaQuery: boolean;
  rules: CSSRule[];
};

interface IDocumentState {
  order: number;
  fluidRangesByAnchor: FluidRangesByAnchor;
}

type DocumentState = Expand<IDocumentState>;

type StylesheetParams = Readonly<{
  rules: CSSRule[];
  breakpoints: number[];
  globalBaselineWidth: number;
}> & {
  documentState: DocumentState;
};

interface ISpans {
  [selector: string]: {
    [property: string]: string;
  };
}

type Spans = Expand<ISpans>;

interface IBatchState {
  currentBatch: StyleBatch | null;
  batches: StyleBatch[];
}

type BatchState = Expand<IBatchState>;

type StyleRuleParams = Pick<StylesheetParams, "breakpoints" | "documentState"> &
  Readonly<{
    batches: StyleBatch[];
    index: number;
    batch: StyleBatch;
    rule: CSSStyleRule;
  }> & {
    spans: Spans;
  };

type FluidPropertyParams = Pick<
  StyleRuleParams,
  "rule" | "spans" | "batches" | "index" | "batch" | "breakpoints"
> &
  Readonly<{
    property: string;
    ruleSpans: RuleSpans;
    order: number;
    lockVarValue: string;
  }> & {
    fluidRangesByAnchor: FluidRangesByAnchor;
  };

type RuleSpans = Readonly<{
  spanStarts: string[];
  spanEnds: string[];
}>;

type SelectorParams = Pick<
  FluidPropertyParams,
  | "spans"
  | "property"
  | "rule"
  | "batches"
  | "index"
  | "order"
  | "batch"
  | "fluidRangesByAnchor"
  | "breakpoints"
  | "lockVarValue"
> &
  Readonly<{
    selector: string;
    isSpanStart: boolean;
    spanEnd: string | undefined;
  }>;

type SpanParams = Pick<
  SelectorParams,
  "selector" | "property" | "rule" | "spans"
>;

type MinMaxValueParams = Pick<
  SelectorParams,
  | "rule"
  | "property"
  | "fluidRangesByAnchor"
  | "selector"
  | "order"
  | "batches"
  | "index"
  | "batch"
  | "spanEnd"
>;

type MinMaxValueResult = {
  minValue: IFluidValue | IFluidValue[];
  maxValue: IFluidValue | IFluidValue[];
  maxValueBatchWidth: number;
  fluidRanges: IFluidRange[];
};

type FluidRangeParams = Pick<
  SelectorParams,
  "batch" | "breakpoints" | "lockVarValue" | "property"
> &
  MinMaxValueResult;

type FluidRangesParams = Pick<
  SelectorParams,
  "selector" | "property" | "order" | "fluidRangesByAnchor"
>;

type MaxValueParams = Pick<SelectorParams, "property" | "selector"> &
  Pick<StyleRuleParams, "batches" | "index"> &
  Readonly<{
    batch: Omit<StyleBatch, "rules" | "isMediaQuery">;
  }>;

type MaxValueResult = {
  maxValue: IFluidValue | IFluidValue[];
  maxValueBatchWidth: number;
};
type NextBatchParams = Pick<MaxValueParams, "selector" | "property" | "batch"> &
  Readonly<{
    nextBatch: StyleBatch;
  }>;

export {
  StyleBatch,
  StylesheetParams,
  Spans,
  BatchState,
  StyleRuleParams,
  FluidPropertyParams,
  SelectorParams,
  SpanParams,
  MinMaxValueParams,
  MinMaxValueResult,
  FluidRangeParams,
  FluidRangesParams,
  MaxValueParams,
  MaxValueResult,
  NextBatchParams,
  RuleSpans,
};
