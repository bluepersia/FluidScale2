import {
  IProcessStyleRuleState,
  IGetMaxValueParams,
  IProcessSelectorState,
  IGetFluidRangesState,
} from "./parse.types";
import { IFluidRange, IFluidValue } from "../index.types";

const FLUID_PROPERTY_NAMES = [
  "font-size",
  "line-height",
  "letter-spacing",
  "word-spacing",
  "text-indent",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "border-top-width",
  "border-right-width",
  "border-bottom-width",
  "border-left-width",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-bottom-right-radius",
  "border-bottom-left-radius",
  "width",
  "min-width",
  "max-width",
  "height",
  "min-height",
  "max-height",
];

const SHORTHAND_PROPERTY_NAMES = [
  "padding",
  "margin",
  "border",
  "border-radius",
];

export function processStyleRule(state: IProcessStyleRuleState): void {
  const { rule } = state;
  for (const property of FLUID_PROPERTY_NAMES) {
    if (SHORTHAND_PROPERTY_NAMES.includes(property)) continue;

    const selectors = splitSelector(rule.selectorText);

    for (const selector of selectors) {
      processSelector({ ...state, selector, property });
    }
  }
}

function splitSelector(selector: string): string[] {
  return selector.split(",").map((selector) => selector.trim());
}

function processSelector(state: IProcessSelectorState): void {
  const minMaxValueResult = getMinMaxValue(state);

  if (!minMaxValueResult) return;

  const [minValue, maxValue, maxValueBatchWidth, fluidRanges] =
    minMaxValueResult;

  fluidRanges.push({
    minValue,
    maxValue,
    breakpointIndex: state.breakpoints.indexOf(state.batch.width),
    nextBreakpointIndex: state.breakpoints.indexOf(maxValueBatchWidth),
  });
}

function getMinMaxValue(
  state: IProcessSelectorState
):
  | [
      IFluidValue | IFluidValue[],
      IFluidValue | IFluidValue[],
      number,
      IFluidRange[]
    ]
  | undefined {
  const { rule, property } = state;

  const minValue = getMinValue(rule, property);
  if (!minValue) return;

  const fluidRanges = getFluidRanges(state);

  let maxValueResult = getMaxValue({
    ...state,
    isEligibleForSingleValue:
      fluidRanges.length === 0 && property === "font-size",
    minValue,
  });
  if (!maxValueResult) return;

  return [minValue, ...maxValueResult, fluidRanges];
}

function getMinValue(
  rule: CSSStyleRule,
  property: string
): IFluidValue | IFluidValue[] | null {
  const value = rule.style.getPropertyValue(property);
  if (!value) return null;
  return parseFluidValue(value);
}

/**
 * TODO: Handle multiple values, decimals, and calculations like min() and max().
 */
function parseFluidValue(value: string): IFluidValue | IFluidValue[] | null {
  // Regex explanation: matches a number (integer) followed by a lettered unit (e.g., px, em)
  const match = value.match(/(\d+)([a-z]+)/);
  if (!match) return null;
  return {
    value: Number(match[1]),
    unit: match[2] ?? "px",
  };
}

function getFluidRanges(state: IGetFluidRangesState): IFluidRange[] {
  const { selector, property, order, fluidRangesByAnchor } = state;
  const selectorSegments = selector.split(" ");
  const anchor = selectorSegments[selectorSegments.length - 1];

  let fluidRangesBySelector = fluidRangesByAnchor[anchor];

  if (!fluidRangesBySelector) {
    state.fluidRangesByAnchor[anchor] = fluidRangesBySelector = {
      [selector]: [{ property, order }, []],
    };
  }
  return fluidRangesBySelector[selector][1];
}

function getMaxValue(
  params: IGetMaxValueParams
): [IFluidValue | IFluidValue[], number] | null {
  const {
    index,
    batches,
    batch,
    property,
    selector,
    isEligibleForSingleValue,
    minValue,
    batch: { width },
  } = params;

  for (let i = index + 1; i < batches.length; i++) {
    const nextBatch = batches[i];

    if (!nextBatch.isMediaQuery) break;

    if (nextBatch.isMediaQuery && nextBatch.width > batch.width) {
      for (const nextRule of nextBatch.rules) {
        if (nextRule instanceof CSSStyleRule) {
          if (splitSelector(nextRule.selectorText).includes(selector)) {
            const nextValue = nextRule.style.getPropertyValue(property);
            if (nextValue) {
              const parsedValue = parseFluidValue(nextValue);
              if (parsedValue) return [parsedValue, nextBatch.width];
            }
          }
        }
      }
    }
  }

  if (isEligibleForSingleValue) return [minValue, width];

  return null;
}
