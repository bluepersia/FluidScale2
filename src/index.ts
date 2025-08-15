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

/**
 * List of CSS property names that can be interpolated fluidly.
 */
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

/**
 * List of CSS shorthand property names that are handled separately.
 */
const SHORTHAND_PROPERTY_NAMES = [
  "padding",
  "margin",
  "border",
  "border-radius",
];

/**
 * Initializes FluidScale by parsing all accessible stylesheets.
 * Logs an error if stylesheets are not accessible (e.g., due to cross-origin restrictions).
 */
export default function init(): void {
  if (!isStyleSheetsAccessible()) {
    console.error(
      "Style sheets are not accessible. Please use a secure origin, or load fluid values from JSON."
    );
    return;
  }
  parseStylesheets(Array.from(document.styleSheets));
}

/**
 * Checks if document.styleSheets is accessible (not blocked by browser security).
 * @returns {boolean} True if accessible, false otherwise.
 */
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
    // Optionally log the error for debugging
    // console.error('Error accessing styleSheets:', e);
    return false;
  }
  return false;
}

/**
 * Parses all provided CSSStyleSheet objects and processes their rules for fluid properties.
 * @param {CSSStyleSheet[]} sheets - Array of stylesheets to parse.
 */
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

/**
 * Groups CSS rules into batches based on media queries and baseline width.
 * @param {CSSRule[]} rules - Array of CSS rules to batch.
 * @returns {StyleBatch[]} Array of StyleBatch objects.
 */
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

/**
 * Finds the baseline width (from the first media query with no rules) in the rules array.
 * @param {CSSRule[]} rules - Array of CSS rules.
 * @returns {number} The baseline width, or 0 if not found.
 */
function getBaselineWidth(rules: CSSRule[]): number {
  for (const rule of rules) {
    if (rule instanceof CSSMediaRule) {
      const mediaRule = rule;
      const minWidth = getMinWidth(mediaRule.media.mediaText);

      // Only use media queries with no rules as baseline
      if (!minWidth || mediaRule.cssRules.length > 0) continue;

      return minWidth;
    }
  }
  return 0;
}

/**
 * Extracts the min-width value from a media query string.
 * @param {string} mediaText - The media query string.
 * @returns {number|null} The min-width in px, or null if not found.
 */
function getMinWidth(mediaText: string): number | null {
  // Regex explanation: matches (min-width: <number>px)
  const match = mediaText.match(/\(min-width:\s*(\d+)px\)/);
  return match ? Number(match[1]) : null;
}

/**
 * Adds a CSSStyleRule to the current batch, or creates a new batch if needed.
 * @param {IBatchStyleRuleState} state - The batching state.
 * @param {CSSStyleRule} rule - The rule to add.
 */
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

/**
 * Starts a new batch for a media query rule.
 * @param {IBatchState} state - The batching state.
 * @param {CSSMediaRule} rule - The media rule to batch.
 */
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

/**
 * Processes a CSSStyleRule for fluid properties and adds fluid ranges to state.
 * @param {CSSStyleRule} rule - The style rule to process.
 * @param {IParseStylesheetState} state - The current parse state.
 */
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

/**
 * Gets the minimum value for a property from a CSSStyleRule.
 * @param {CSSStyleRule} rule - The style rule.
 * @param {string} property - The property name.
 * @returns {IFluidValue|null} The parsed value, or null if not found.
 */
function getMinValue(
  rule: CSSStyleRule,
  property: string
): IFluidValue | IFluidValue[] | null {
  const value = rule.style.getPropertyValue(property);
  if (!value) return null;
  return parseFluidValue(value);
}

/**
 * Parses a CSS value string into an IFluidValue object or array.
 * @param {string} value - The CSS value string (e.g., '16px').
 * @returns {IFluidValue|null} The parsed value, or null if not matched.
 *
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

/**
 * Finds the maximum value for a property in subsequent batches (media queries).
 * @param {IGetMaxValueParams} params - Parameters for finding the max value.
 * @returns {IFluidValue|null} The parsed value, or null if not found.
 */
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
