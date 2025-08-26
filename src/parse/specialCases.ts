// SPANS //

import { IFluidValue } from "../index.types";
import {
  ProcessShadowValueState,
  RuleSpans,
  SpanParams,
  Spans,
} from "./parse.types";
import { Function } from "../index.types";

function getRuleSpans(rule: CSSStyleRule): {
  spanStarts: string[];
  spanEnds: string[];
} {
  const spanStartVarValue =
    rule.style.getPropertyValue("--fluid-span-start") || "";
  const spanStarts = spanStartVarValue
    .split(",")
    .map((segment) => segment.trim());

  const spanEndVarValue = rule.style.getPropertyValue("--fluid-span-end") || "";
  const spanEnds = spanEndVarValue.split(",").map((segment) => segment.trim());

  return { spanStarts, spanEnds };
}

function getSpanFlags(
  property: string,
  ruleSpans: RuleSpans
): {
  isSpanStart: boolean;
  isSpanEnd: boolean;
} {
  const { spanStarts, spanEnds } = ruleSpans;

  const isSpanStart =
    spanStarts.includes("all") || spanStarts.includes(property);

  const isSpanEnd = spanEnds.includes("all") || spanEnds.includes(property);

  return { isSpanStart, isSpanEnd };
}

function getSpanEndValue(
  selector: string,
  property: string,
  spans: Spans
): string {
  const spanEnd = spans?.[selector]?.[property];
  if (!spanEnd)
    throw Error(`${property} is marked as span end but not span start.`);

  return spanEnd;
}

function applySpan(params: SpanParams): void {
  const { spans, property, selector, rule } = params;
  if (!spans[selector]) {
    spans[selector] = {};
  }
  spans[selector][property] = rule.style.getPropertyValue(property);
}

// LOCKS //

function parseLocks(
  lockVarValue: string,
  property: string
): number[] | "all" | false {
  const locks: number[] = [];
  const locksRaw = lockVarValue.split(",").map((segment) => segment.trim());

  if (locksRaw.includes("all") || locksRaw.includes(property)) return "all";

  for (const lockRaw of locksRaw) {
    const propertyAndIndex = lockRaw.split("/");
    if (propertyAndIndex[0] === property && propertyAndIndex.length > 1) {
      const index = Number(propertyAndIndex[1]);
      locks.push(index);
    }
  }

  if (locks.length <= 0) return false;

  return locks;
}

function makeForceList(forceVarValue: string): string[] {
  const result =
    forceVarValue
      .split(",")
      .map((prop) => prop.trim())
      .filter((prop) => prop !== "") || [];
  result.push("--fluid-bg-size");
  return result;
}

function makeValueIndexMap(
  property: string,
  minValue: IFluidValue | (IFluidValue | ",")[],
  maxValue: IFluidValue | (IFluidValue | ",")[]
): Map<number, number> | undefined {
  if (
    property === "box-shadow" ||
    property === "text-shadow" ||
    property === "transform" ||
    property === "filter"
  ) {
    minValue = Array.isArray(minValue) ? minValue : [minValue];
    maxValue = Array.isArray(maxValue) ? maxValue : [maxValue];

    const [minValueMaps, maxValueMaps] = makeMinMaxValueMaps(
      property,
      minValue,
      maxValue
    );

    if (minValueMaps && maxValueMaps) {
      return newValueIndexMapFromMinMax(minValueMaps, maxValueMaps);
    }
  }
}

function makeMinMaxValueMaps(
  property: string,
  minValue: (IFluidValue | ",")[],
  maxValue: (IFluidValue | ",")[]
): [Map<string, number>[], Map<string, number>[]] {
  let minValueMaps: Map<string, number>[] = [];
  let maxValueMaps: Map<string, number>[] = [];

  if (property === "box-shadow") {
    minValueMaps = makeBoxShadowValueIndexMaps(minValue);
    maxValueMaps = makeBoxShadowValueIndexMaps(maxValue);
  }
  if (property === "text-shadow") {
    minValueMaps = makeTextShadowValueIndexMaps(minValue);
    maxValueMaps = makeTextShadowValueIndexMaps(maxValue);
  }
  if (property === "transform" || property === "filter") {
    minValueMaps = makeGraphicsPropertyValueIndexMaps(minValue);
    maxValueMaps = makeGraphicsPropertyValueIndexMaps(maxValue);
  }

  return [minValueMaps, maxValueMaps];
}

function newValueIndexMapFromMinMax(
  minValueMaps: Map<string, number>[],
  maxValueMaps: Map<string, number>[]
): Map<number, number> {
  const valueMap = new Map<number, number>();
  for (const [i, minValueMap] of minValueMaps.entries()) {
    if (i >= maxValueMaps.length) break;

    const maxValueMap = maxValueMaps[i];
    for (const [key, value] of Object.entries(minValueMap)) {
      if (maxValueMap.has(key)) {
        const maxValueNum = maxValueMap.get(key);
        if (maxValueNum) valueMap.set(value, maxValueNum);
      }
    }
  }

  return valueMap;
}

function makeBoxShadowValueIndexMaps(
  shadows: (IFluidValue | ",")[]
): Map<string, number>[] {
  const result: Map<string, number>[] = [];

  let numCount = 0;
  let boxShadowMap: Map<string, number> = new Map();
  const state = {
    numCount,
    shadowMap: boxShadowMap,
    type: "box" as const,
    result,
  };
  for (const [i, part] of shadows.entries()) {
    processShadowValue(state, part, i);
  }
  result.push(boxShadowMap);

  return result;
}

function makeTextShadowValueIndexMaps(
  shadows: (IFluidValue | ",")[]
): Map<string, number>[] {
  const result: Map<string, number>[] = [];

  let numCount = 0;
  let textShadowMap: Map<string, number> = new Map();
  const state = {
    numCount,
    shadowMap: textShadowMap,
    type: "text" as const,
    result,
  };
  for (const [i, part] of shadows.entries()) {
    processShadowValue(state, part, i);
  }
  result.push(textShadowMap);

  return result;
}

function processShadowValue(
  state: ProcessShadowValueState,
  part: IFluidValue | ",",
  index: number
): void {
  const { numCount, shadowMap, type, result } = state;
  if (part === ",") {
    state.numCount = 0;
    result.push(shadowMap);
    state.shadowMap = new Map<string, number>();
    return;
  }
  if (type === "box" && part.value === "inset") shadowMap.set("inset", index);
  else if (typeof part.value === "number") {
    if (numCount === 0) shadowMap.set("xOffset", index);
    else if (numCount === 1) shadowMap.set("yOffset", index);
    else if (numCount === 2) shadowMap.set("blur", index);
    else if (type === "box" && numCount === 3) shadowMap.set("spread", index);
    state.numCount++;
  } else if (typeof part.value === "string") {
    shadowMap.set("color", index);
  }
}

function makeGraphicsPropertyValueIndexMaps(
  values: (IFluidValue | ",")[]
): Map<string, number>[] {
  const result: Map<string, number>[] = [];

  let currentMap: Map<string, number> = new Map();
  for (const [i, part] of values.entries()) {
    if (part === ",") {
      result.push(currentMap);
      currentMap = new Map();
    } else if (typeof part.value === "object" && "type" in part.value) {
      const calcType = (part.value as Function).type;
      currentMap.set(calcType, i);
    }
  }

  return result;
}

export {
  getRuleSpans,
  getSpanFlags,
  getSpanEndValue,
  applySpan,
  parseLocks,
  makeForceList,
  makeBoxShadowValueIndexMaps as makeBoxShadowValueMaps,
  makeTextShadowValueIndexMaps as makeTextShadowValueMaps,
  makeValueIndexMap,
};
