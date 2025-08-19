import {
  StyleRuleParams,
  SelectorParams,
  FluidRangesParams,
  FluidRangeParams,
  FluidPropertyParams,
} from "./parse.types";
import { IFluidRange } from "../index.types";
import { getFluidRangeBlueprint } from "./values";
import {
  applySpan,
  getRuleSpans,
  getSpanEndValue,
  getSpanFlags,
  parseLocks,
} from "./specialCases";

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

function processStyleRule(params: StyleRuleParams): void {
  const { rule, documentState } = params;
  documentState.order++;

  const ruleSpans = getRuleSpans(rule);
  const lockVarValue = rule.style.getPropertyValue("--fluid-lock");

  for (const property of FLUID_PROPERTY_NAMES) {
    parseFluidProperty({
      property,
      ...params,
      ...documentState,
      ruleSpans,
      lockVarValue,
    });
  }
}

function parseFluidProperty(params: FluidPropertyParams): void {
  const { property, ruleSpans, rule, spans } = params;

  if (SHORTHAND_PROPERTY_NAMES.includes(property)) return;

  const { isSpanStart, isSpanEnd } = getSpanFlags(property, ruleSpans);

  const selectors = splitSelector(rule.selectorText);

  for (const selector of selectors) {
    const spanEnd = isSpanEnd
      ? getSpanEndValue(selector, property, spans)
      : undefined;
    processSelector({
      ...params,
      selector,
      isSpanStart,
      spanEnd,
    });
  }
}

function splitSelector(selector: string): string[] {
  return selector.split(",").map((selector) => selector.trim());
}

function processSelector(params: SelectorParams): void {
  const { isSpanStart } = params;

  if (isSpanStart) {
    applySpan(params);
    return;
  }

  const fluidRangeBlueprint = getFluidRangeBlueprint(params);

  if (!fluidRangeBlueprint) return;

  const fluidRange: IFluidRange = makeFluidRange({
    ...params,
    ...fluidRangeBlueprint,
  });

  fluidRangeBlueprint.fluidRanges.push(fluidRange);
}

function makeFluidRange(params: FluidRangeParams): IFluidRange {
  const {
    property,
    batch: { width },
    breakpoints,
    maxValueBatchWidth,
    lockVarValue,
  } = params;

  const locks = parseLocks(lockVarValue, property);

  const fluidRange: IFluidRange = {
    ...params,
    minIndex: breakpoints.indexOf(width),
    maxIndex: breakpoints.indexOf(maxValueBatchWidth),
  };
  if (locks) {
    fluidRange.locks = locks;
  }
  return fluidRange;
}

function getFluidRanges(params: FluidRangesParams): IFluidRange[] {
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

export { processStyleRule, splitSelector, getFluidRanges };
