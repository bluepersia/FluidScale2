// SPANS //

import { RuleSpans, SpanParams, Spans } from "./parse.types";

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

export { getRuleSpans, getSpanFlags, getSpanEndValue, applySpan, parseLocks };
