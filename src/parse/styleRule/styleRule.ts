import {
  StyleRuleParams,
  SelectorParams,
  FluidPropertyParams,
} from "../parse.types";
import { IFluidRange } from "../../index.types";
import { getFluidRangeBlueprint } from "../values/minMaxRange";
import {
  applySpan,
  getRuleSpans,
  getSpanEndValue,
  getSpanFlags,
  makeForceList,
} from "../specialCases";
import { makeFluidRange } from "./fluidRangeGetMaker";

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
  "grid-template-columns",
  "grid-template-rows",
  "background-position-x",
  "background-position-y",
  "--fluid-bg-size",
];

const SHORTHAND_PROPERTY_NAMES = [
  "padding",
  "margin",
  "border",
  "border-radius",
  "background-position",
];

function processStyleRule(params: StyleRuleParams): void {
  const { rule, documentState } = params;
  documentState.order++;

  const isMarkedAsDynamic =
    rule.style.getPropertyValue("--fluid-dynamic") === "true";
  const ruleSpans = getRuleSpans(rule);
  const lockVarValue = rule.style.getPropertyValue("--fluid-lock");
  const force = makeForceList(rule.style.getPropertyValue("--fluid-force"));
  for (const property of FLUID_PROPERTY_NAMES) {
    parseFluidProperty({
      property,
      ...params,
      ...documentState,
      ruleSpans,
      lockVarValue,
      isMarkedAsDynamic,
      force,
    });
  }
}

function parseFluidProperty(params: FluidPropertyParams): void {
  const { property, ruleSpans, rule, spans } = params;

  if (SHORTHAND_PROPERTY_NAMES.includes(property)) return;

  if (skipBackgroundSize(property, rule.style)) return;

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

function skipBackgroundSize(
  property: string,
  style: CSSStyleDeclaration
): boolean {
  return (
    property === "background-size" &&
    style.getPropertyValue("--fluid-bg-size").length > 0
  );
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

export { processStyleRule, splitSelector };
