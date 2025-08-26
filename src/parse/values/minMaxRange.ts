import { IFluidValue } from "../../index.types";
import {
  MaxValueParams,
  MaxValueResult,
  MinMaxValueParams,
  MinMaxValueResult,
  NextBatchParams,
} from "../parse.types";
import { splitSelector } from "../styleRule/styleRule";
import { parseFluidValue } from "./fluidValueParser";
import { getMakeFluidRanges } from "../styleRule/fluidRangeGetMaker";

export function getFluidRangeBlueprint(
  params: MinMaxValueParams
): MinMaxValueResult | undefined {
  const { rule, property, spanEnd } = params;
  const minValue = getMinValue(rule, property, spanEnd);
  if (!minValue) return;

  let maxValueResult = getMaxValue(params);
  if (!maxValueResult) {
    const { force, batches } = params;
    if (force.includes("all") || force.includes(property))
      maxValueResult = {
        maxValue: minValue,
        maxValueBatchWidth: batches[batches.length - 1].width,
      };
    else return;
  }

  const fluidRanges = getMakeFluidRanges(params);
  return { minValue, ...maxValueResult, fluidRanges };
}

function getMinValue(
  rule: CSSStyleRule,
  property: string,
  spanEnd?: string
): IFluidValue | (IFluidValue | ",")[] | null {
  const value = spanEnd || rule.style.getPropertyValue(property);
  if (!value) return null;
  return parseFluidValue(value, property);
}

function getMaxValue(params: MaxValueParams): MaxValueResult | null {
  const { index, batches } = params;

  for (let i = index + 1; i < batches.length; i++) {
    const nextBatch = batches[i];

    if (!nextBatch.isMediaQuery) break;

    const nextBatchResult = processNextBatch({ nextBatch, ...params });
    if (nextBatchResult) return nextBatchResult;
  }

  return null;
}

function processNextBatch(params: NextBatchParams): MaxValueResult | null {
  const {
    nextBatch,
    batch: { width },
    selector,
    property,
  } = params;
  if (nextBatch.isMediaQuery && nextBatch.width > width) {
    for (const nextRule of nextBatch.rules) {
      if (nextRule instanceof CSSStyleRule) {
        if (splitSelector(nextRule.selectorText).includes(selector)) {
          const nextValue = nextRule.style.getPropertyValue(property);
          if (nextValue) {
            const maxValue = parseFluidValue(nextValue, property);
            if (maxValue)
              return { maxValue, maxValueBatchWidth: nextBatch.width };
          }
        }
      }
    }
  }
  return null;
}
