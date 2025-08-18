import {
  DeepReadonly,
  DeepReadonlyExcept,
  Expand,
  FluidRangesByAnchor,
} from "../index.types";

export type StyleBatch = {
  width: number;
  isMediaQuery: boolean;
  rules: CSSRule[];
};

interface IDocumentState {
  order: number;
  fluidRangesByAnchor: FluidRangesByAnchor;
}

export type DocumentState = Expand<IDocumentState>;

export type StylesheetParams = DeepReadonlyExcept<
  {
    sheet: CSSStyleSheet;
    breakpoints: number[];
    globalBaselineWidth: number;
    documentState: DocumentState;
  },
  "documentState"
>;

interface IBatchState {
  currentBatch: StyleBatch | null;
  batches: StyleBatch[];
}

export type BatchState = Expand<IBatchState>;

export type StyleRuleParams = Pick<
  StylesheetParams,
  "breakpoints" | "documentState"
> &
  DeepReadonly<{
    batches: StyleBatch[];
    index: number;
    batch: StyleBatch;
    rule: CSSStyleRule;
  }>;

export type SelectorParams = Omit<StyleRuleParams, "documentState"> &
  DeepReadonlyExcept<
    {
      order: number;
      fluidRangesByAnchor: FluidRangesByAnchor;
      selector: string;
      property: string;
      rule: CSSStyleRule;
    },
    "fluidRangesByAnchor"
  >;

export type FluidRangeParams = Pick<
  SelectorParams,
  "selector" | "property" | "order" | "fluidRangesByAnchor"
>;

export type MaxValueParams = Pick<
  SelectorParams,
  "property" | "selector" | "fluidRangesByAnchor"
> &
  Pick<StyleRuleParams, "batches" | "index"> &
  DeepReadonly<{
    batch: Omit<StyleBatch, "rules" | "isMediaQuery">;
  }>;
