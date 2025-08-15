import {
  StyleBatch,
  IBatchState,
  IBatchStyleRuleState,
  IProcessStyleRuleState,
  IFluidRange,
} from "./parse.types";
import { processStyleRule } from "./styleRule";

export function parseDocument(document: Document): void {
  if (!isStyleSheetsAccessible(document)) {
    console.error(
      "Style sheets are not accessible. Please use a secure origin, or load fluid values from JSON."
    );
    return;
  }
  const sheets = Array.from(document.styleSheets);
  const fluidRanges: IFluidRange[] = [];

  const globalBaselineWidth = getBaselineWidth(
    sheets.map((sheet) => [...Array.from(sheet.cssRules)]).flat()
  );
  for (const sheet of sheets) {
    parseStylesheet(sheet, fluidRanges, globalBaselineWidth);
  }
}

function isStyleSheetsAccessible(document: Document) {
  try {
    const sheets = document.styleSheets;
    if (sheets.length >= 0) {
      return true;
    }
  } catch (e) {
    return false;
  }
  return false;
}

function parseStylesheet(
  sheet: CSSStyleSheet,
  fluidRanges: IFluidRange[],
  globalBaselineWidth: number | null
): void {
  const rules: CSSRule[] = Array.from(sheet.cssRules);

  const batches: StyleBatch[] = batchStylesheet(rules, globalBaselineWidth);

  for (const [index, batch] of batches.entries()) {
    for (const rule of batch.rules) {
      if (rule instanceof CSSStyleRule) {
        const state: IProcessStyleRuleState = {
          batches,
          fluidRanges,
          index,
          batch,
          rule,
        };
        processStyleRule(state);
      }
    }
  }
}

function batchStylesheet(
  rules: CSSRule[],
  globalBaselineWidth: number | null
): StyleBatch[] {
  const state: IBatchStyleRuleState = {
    currentBatch: null,
    batches: [],
    baselineWidth: getBaselineWidth(rules) ?? globalBaselineWidth ?? 0,
  };
  for (const rule of rules) {
    if (rule instanceof CSSStyleRule) batchStyleRule(state, rule);
    else if (rule instanceof CSSMediaRule) batchMediaRule(state, rule);
  }
  return state.batches;
}

function getBaselineWidth(rules: CSSRule[]): number | null {
  for (const rule of rules) {
    if (rule instanceof CSSMediaRule) {
      const mediaRule = rule;
      const minWidth = getMinWidth(mediaRule.media.mediaText);

      if (minWidth && mediaRule.cssRules.length <= 0) return minWidth;
    }
  }
  return null;
}

function getMinWidth(mediaText: string): number | null {
  // Regex explanation: matches (min-width: <number>px)
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
