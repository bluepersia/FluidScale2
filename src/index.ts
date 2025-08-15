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
  parseStylesheets(Array.from(document.styleSheets));
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
        if (rule.type === CSSRule.STYLE_RULE) {
          processStyleRule(rule as CSSStyleRule, { ...state, index, batch });
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
    if (rule.type === CSSRule.STYLE_RULE)
      batchStyleRule(state, rule as CSSStyleRule);
    else if (rule.type === CSSRule.MEDIA_RULE)
      batchMediaRule(state, rule as CSSMediaRule);
  }
  return state.batches;
}

function getBaselineWidth(rules: CSSRule[]): number {
  for (const rule of rules) {
    if (rule.type === CSSRule.MEDIA_RULE) {
      const mediaRule = rule as CSSMediaRule;
      if (
        hasMinWidth(mediaRule.media.mediaText) ||
        mediaRule.cssRules.length > 0
      )
        continue;
      const minWidth = getMinWidth(mediaRule.media.mediaText);
      if (minWidth) return minWidth;
    }
  }
  return 0;
}

function hasMinWidth(mediaText: string): boolean {
  return mediaText.includes("(min-width");
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
  const mediaRule = rule as CSSMediaRule;
  state.currentBatch = null;

  if (hasMinWidth(mediaRule.media.mediaText))
    state.batches.push({
      width: getMinWidth(mediaRule.media.mediaText) ?? 0,
      isMediaQuery: true,
      rules: Array.from(mediaRule.cssRules),
    });
}

function processStyleRule(
  rule: CSSStyleRule,
  state: IParseStylesheetState
): void {
  const styleRule = rule as CSSStyleRule;
  for (const property of FLUID_PROPERTY_NAMES) {
    if (SHORTHAND_PROPERTY_NAMES.includes(property)) continue;

    const minValue = getMinValue(rule, property);
    if (!minValue) continue;

    const maxValue = getMaxValue({ ...state, property });
    if (!maxValue) continue;

    const selectorText = styleRule.selectorText;

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
        if (nextRule.type === CSSRule.STYLE_RULE) {
          const nextStyleRule = nextRule as CSSStyleRule;
          const nextValue = nextStyleRule.style.getPropertyValue(property);
          if (nextValue) return parseFluidValue(nextValue);
        }
      }
    }
  }
  return null;
}
