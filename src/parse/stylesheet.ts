import { StyleBatch, BatchState, StylesheetParams } from "./parse.types";
import { ParsedDocument } from "../index.types";
import { processStyleRule } from "./styleRule/styleRule";

export function parseDocument(document: Document): ParsedDocument | null {
  if (!isStyleSheetsAccessible(document)) {
    console.error(
      "Style sheets are not accessible. Please use a secure origin, or load fluid values from JSON."
    );
    return null;
  }
  const sheets = Array.from(document.styleSheets);

  const rulesPerSheet: CSSRule[][] = getRulesPerSheet(sheets);
  const stylesheetParams = makeStylesheetParams(rulesPerSheet);

  for (const rules of rulesPerSheet) {
    parseStylesheet({ rules, ...stylesheetParams });
  }

  return {
    ...stylesheetParams,
    fluidRangesByAnchor: stylesheetParams.documentState.fluidRangesByAnchor,
  };
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

function getRulesPerSheet(sheets: CSSStyleSheet[]): CSSRule[][] {
  return sheets
    .filter((sheet) => {
      try {
        const rules = sheet.cssRules;
        return rules ? true : false;
      } catch (err) {
        return false;
      }
    })
    .map((sheet) => Array.from(sheet.cssRules));
}

function makeStylesheetParams(
  rulesPerSheet: CSSRule[][]
): Omit<StylesheetParams, "rules"> {
  return {
    documentState: { order: 0, fluidRangesByAnchor: {} },
    breakpoints: getBreakpoints(rulesPerSheet),
    globalBaselineWidth: getBaselineWidth(rulesPerSheet.flat()) ?? 0,
  };
}

function parseStylesheet(params: StylesheetParams): void {
  let { rules, globalBaselineWidth } = params;
  const spans = {};

  const batches: StyleBatch[] = batchStylesheet(rules, globalBaselineWidth);
  for (const [index, batch] of batches.entries()) {
    for (const rule of batch.rules) {
      if (rule instanceof CSSStyleRule) {
        processStyleRule({
          ...params,
          batches,
          index,
          batch,
          rule,
          spans,
        });
      }
    }
  }
}

function getBreakpoints(rulesPerSheet: CSSRule[][]): number[] {
  const breakpoints = new Set<number>();
  for (const rules of rulesPerSheet) {
    for (const rule of rules) {
      if (rule instanceof CSSMediaRule) {
        const minWidth = getMinWidth(rule.media.mediaText);
        if (minWidth) {
          breakpoints.add(minWidth);
        }
      }
    }
  }
  const breakpointsArray = Array.from(breakpoints);
  breakpointsArray.sort((a, b) => a - b);
  return breakpointsArray;
}
function batchStylesheet(
  rules: CSSRule[],
  globalBaselineWidth: number
): StyleBatch[] {
  const state: BatchState = {
    currentBatch: null,
    batches: [],
  };

  const baselineWidth = getBaselineWidth(rules) ?? globalBaselineWidth;

  for (const rule of rules) {
    if (rule instanceof CSSStyleRule)
      batchStyleRule(rule, state, baselineWidth);
    else if (rule instanceof CSSMediaRule) batchMediaRule(rule, state);
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

function batchStyleRule(
  rule: CSSStyleRule,
  state: BatchState,
  baselineWidth: number
): void {
  let { currentBatch, batches } = state;
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

function batchMediaRule(rule: CSSMediaRule, state: BatchState): void {
  state.currentBatch = null;

  const minWidth = getMinWidth(rule.media.mediaText);
  if (minWidth)
    state.batches.push({
      width: minWidth,
      isMediaQuery: true,
      rules: Array.from(rule.cssRules),
    });
}
