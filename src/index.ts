import {
  StyleBatch,
  IBatchState,
  IBatchStyleRuleState,
  IParseStylesheetState,
  IParseStylesheetStateBase,
  IFluidRange,
  IGetMaxValueParams,
  IFluidValue,
} from "./index.types";

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

export default function init(): void {
  if (!isStyleSheetsAccessible()) {
    console.error(
      "Style sheets are not accessible. Please use a secure origin, or load fluid values from JSON."
    );
    return;
  }
  parseStylesheets(Array.from(document.styleSheets));
}

function isStyleSheetsAccessible() {
  try {
    // Attempt to read document.styleSheets
    const sheets = document.styleSheets;
    // Try to access a property to ensure no security error is thrown
    if (sheets.length >= 0) {
      return true;
    }
  } catch (e) {
    // Accessing styleSheets may throw a SecurityError for cross-origin styles
    return false;
  }
  return false;
}

function parseStylesheets(sheets: CSSStyleSheet[]): void {
  const fluidRanges: IFluidRange[] = [];

  for (const sheet of sheets) {
    const rules: CSSRule[] = Array.from(sheet.cssRules);

    const batches: StyleBatch[] = batchStylesheet(rules);
    const state: IParseStylesheetStateBase = {
      batches,
      fluidRanges,
    };

    for (const [index, batch] of batches.entries()) {
      for (const rule of batch.rules) {
        if (rule instanceof CSSStyleRule) {
          processStyleRule(rule, { ...state, index, batch });
        }
      }
    }
  }
}

function batchStylesheet(rules: CSSRule[]): StyleBatch[] {
  const state: IBatchStyleRuleState = {
    currentBatch: null,
    batches: [],
    baselineWidth: getBaselineWidth(rules),
  };
  for (const rule of rules) {
    if (rule instanceof CSSStyleRule) batchStyleRule(state, rule);
    else if (rule instanceof CSSMediaRule) batchMediaRule(state, rule);
  }
  return state.batches;
}

function getBaselineWidth(rules: CSSRule[]): number {
  for (const rule of rules) {
    if (rule instanceof CSSMediaRule) {
      const mediaRule = rule;
      const minWidth = getMinWidth(mediaRule.media.mediaText);

      if (!minWidth || mediaRule.cssRules.length > 0) continue;

      return minWidth;
    }
  }
  return 0;
}

function getMinWidth(mediaText: string): number | null {
  const match = mediaText.match(/\(min-width:\s*(\d+)px\)/);
  return match ? Number(match[1]) : null;
}

function batchStyleRule(state: IBatchStyleRuleState, rule: CSSStyleRule): void {
  let { currentBatch, batches, baselineWidth } = state;
  if (currentBatch === null) {
    currentBatch = {
      width: baselineWidth,
      isMediaQuery: false,
      rules: [],
    };
    batches.push(currentBatch);
    state.currentBatch = currentBatch;
  }
  currentBatch.rules.push(rule);
}

function batchMediaRule(state: IBatchState, rule: CSSMediaRule): void {
  state.currentBatch = null;

  const minWidth = getMinWidth(rule.media.mediaText);
  if (minWidth)
    state.batches.push({
      width: minWidth,
      isMediaQuery: true,
      rules: Array.from(rule.cssRules),
    });
}

function processStyleRule(
  rule: CSSStyleRule,
  state: IParseStylesheetState
): void {
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

function getMinValue(rule: CSSStyleRule, property: string): IFluidValue | null {
  const value = rule.style.getPropertyValue(property);
  if (!value) return null;
  return parseFluidValue(value);
}

function parseFluidValue(value: string): IFluidValue | null {
  //TODO: Handle multiple values, decimals, and calculations like min() and max()
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
}: IGetMaxValueParams): IFluidValue | null {
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
