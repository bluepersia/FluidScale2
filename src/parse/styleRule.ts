import {
  StyleRuleParams,
  SelectorParams,
  FluidRangeParams,
} from "./parse.types";
import { IFluidBreakpointRange } from "../index.types";
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

export function processStyleRule(params: StyleRuleParams): void {
  const { rule, documentState } = params;
  const order = documentState.order++;

  for (const property of FLUID_PROPERTY_NAMES) {
    if (SHORTHAND_PROPERTY_NAMES.includes(property)) continue;

    const selectors = splitSelector(rule.selectorText);

    for (const selector of selectors) {
      processSelector({
        ...params,
        selector,
        property,
        order,
        fluidRangesByAnchor: documentState.fluidRangesByAnchor,
      });
    }
  }
}

export function splitSelector(selector: string): string[] {
  return selector.split(",").map((selector) => selector.trim());
}

function processSelector(params: SelectorParams): void {
  const minMaxValueResult = getMinMaxValue(params);

  if (!minMaxValueResult) return;

  const [minValue, maxValue, maxValueBatchWidth, fluidRanges] =
    minMaxValueResult;

  fluidRanges.push({
    minValue,
    maxValue,
    minIndex: params.breakpoints.indexOf(params.batch.width),
    maxIndex: params.breakpoints.indexOf(maxValueBatchWidth),
  });
}

export function getFluidRanges(
  params: FluidRangeParams
): IFluidBreakpointRange[] {
  const { selector, property, order, fluidRangesByAnchor } = params;
  const strippedSelector = stripModifiers(selector);
  const dynamicSelector = strippedSelector === selector ? undefined : selector;
  const selectorSegments = strippedSelector.split(" ");
  const anchor = selectorSegments[selectorSegments.length - 1];

  let fluidRangesBySelector = fluidRangesByAnchor[anchor];

  if (!fluidRangesBySelector) {
    params.fluidRangesByAnchor[anchor] = fluidRangesBySelector = {
      [strippedSelector]: [{ property, orderID: order, dynamicSelector }, []],
    };
  }
  return fluidRangesBySelector[selector][1];
}

function stripModifiers(selectorText: string): string {
  return (
    selectorText
      // remove BEM modifiers (anything starting with `--` until next non-name char)
      .replace(/--[a-zA-Z0-9_-]+/g, "")
      // remove common dynamic pseudos
      .replace(
        /:(hover|focus|active|visited|disabled|checked|focus-visible|focus-within)/g,
        ""
      )
      .trim()
  );
}
