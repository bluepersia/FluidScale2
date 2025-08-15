/**
 * Represents a batch of CSS rules grouped by a specific width (breakpoint).
 */
export type StyleBatch = {
  /** The width (usually from a media query) that this batch applies to. */
  width: number;
  /** Whether this batch is from a media query. */
  isMediaQuery: boolean;
  /** The CSS rules in this batch. */
  rules: CSSRule[];
};

/**
 * State for batching CSS rules, including the current batch and all batches.
 */
export interface IBatchState {
  currentBatch: StyleBatch | null;
  batches: StyleBatch[];
}

/**
 * Extends IBatchState with a baseline width for the initial batch.
 */
export interface IBatchStyleRuleState extends IBatchState {
  baselineWidth: number;
}

/**
 * Base state for parsing a stylesheet, including all batches and fluid ranges found.
 */
export interface IParseStylesheetStateBase {
  batches: StyleBatch[];
  fluidRanges: IFluidRange[];
}

/**
 * State for parsing a specific batch within a stylesheet.
 */
export interface IParseStylesheetState extends IParseStylesheetStateBase {
  /** Index of the current batch. */
  index: number;
  /** The current batch being processed. */
  batch: StyleBatch;
}

/**
 * Represents a fluid property range for a selector, with min/max values.
 */
export interface IFluidRange {
  /** Minimum value for the property (can be an array for multiple values (e.g. grid columns). */
  minValue: IFluidValue | IFluidValue[];
  /** Maximum value for the property (can be an array for multiple values (e.g. grid columns). */
  maxValue: IFluidValue | IFluidValue[];
  /** The CSS property name. */
  property: string;
  /** The selector this range applies to. */
  selectorText: string;
}

/**
 * Represents a single fluid value (number and unit).
 */
export interface IFluidValue {
  value: number;
  unit: string;
}

/**
 * Parameters for finding the max value for a property in a batch sequence.
 */
export interface IGetMaxValueParams {
  index: number;
  batches: StyleBatch[];
  batch: StyleBatch;
  property: string;
}
