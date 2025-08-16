import {
  IProcessStyleRuleState,
  IProcessSelectorState,
  IGetFluidRangesState,
} from "./parse.types";
import { IFluidRange } from "../index.types";
import { getMinMaxValue } from "./values";

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

export function splitSelector(selector: string): string[] {
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

export function getFluidRanges(state: IGetFluidRangesState): IFluidRange[] {
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
