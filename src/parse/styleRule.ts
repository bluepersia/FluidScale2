import {
  IProcessStyleRuleState,
  IGetMaxValueParams,
  IFluidValue,
} from "./parse.types";

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

    const minValue = getMinValue(rule, property);
    if (!minValue) continue;

    const maxValue = getMaxValue({ ...state, property });
    if (!maxValue) continue;

    const selectorText = rule.selectorText;

    state.fluidRanges.push({
      minValue,
      maxValue,
      property,
      selectorText,
    });
  }
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
  // Regex explanation: matches a number (integer) followed by a unit (e.g., px, em)
  const match = value.match(/(\d+)([a-z]+)/);
  if (!match) return null;
  return {
    value: Number(match[1]),
    unit: match[2] ?? "px",
  };
}

function getMaxValue({
  index,
  batches,
  batch,
  property,
}: IGetMaxValueParams): IFluidValue | IFluidValue[] | null {
  for (let i = index + 1; i < batches.length; i++) {
    const nextBatch = batches[i];

    if (!nextBatch.isMediaQuery) break;

    if (nextBatch.isMediaQuery && nextBatch.width > batch.width) {
      for (const nextRule of nextBatch.rules) {
        if (nextRule instanceof CSSStyleRule) {
          const nextStyleRule = nextRule;
          const nextValue = nextStyleRule.style.getPropertyValue(property);
          if (nextValue) return parseFluidValue(nextValue);
        }
      }
    }
  }
  return null;
}
