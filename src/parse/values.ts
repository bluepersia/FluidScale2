import { IFluidBreakpointRange, IFluidValue } from "../index.types";
import { MaxValueParams, SelectorParams } from "./parse.types";
import { getFluidRanges, splitSelector } from "./styleRule";

export function getMinMaxValue(
  params: SelectorParams
):
  | [
      IFluidValue | IFluidValue[],
      IFluidValue | IFluidValue[],
      number,
      IFluidBreakpointRange[]
    ]
  | undefined {
  const { rule, property } = params;

  const minValue = getMinValue(rule, property);
  if (!minValue) return;

  const fluidRanges = getFluidRanges(params);

  let maxValueResult = getMaxValue(params);
  if (!maxValueResult) return;

  return [minValue, ...maxValueResult, fluidRanges];
}

function getMinValue(
  rule: CSSStyleRule,
  property: string
): IFluidValue | IFluidValue[] | null {
  const value = rule.style.getPropertyValue(property);
  if (!value) return null;
  return parseFluidValue(value, property);
}

function parseFluidValue(
  value: string,
  property: string
): IFluidValue | IFluidValue[] | null {
  if (!value || typeof value !== "string") return null;

  if (property === "grid-template-columns" || property === "grid-template-rows")
    return { value, unit: "" };

  const parts = splitOuter(value);
  const results: IFluidValue[] = parseParts(parts);
  if (results.length === 0) return null;
  if (results.length === 1) return results[0];
  return results;
}

function parseParts(parts: string[]): IFluidValue[] {
  const results: IFluidValue[] = [];
  for (let part of parts) {
    let i = 0;
    i = skipSpaces(part, i);
    let parsed: any = null;
    if (/^(min|max|clamp|calc|minmax)\(/i.test(part.slice(i))) {
      parsed = parseFunction(part, i) || parseOperator(part, i);
    } else {
      parsed = parseNumberUnit(part, i);
    }
    if (!parsed) continue;
    results.push({ value: parsed.value, unit: parsed.unit });
  }
  return results;
}
// Fluid value parsing helpers
function skipSpaces(str: string, i: number) {
  while (i < str.length && /\s/.test(str[i])) i++;
  return i;
}

// Helper: parse a number+unit (e.g. 1.5px, 100%, 2.5em, 10)
function parseNumberUnit(str: string, i: number) {
  let numberMatch = str.slice(i).match(/^[+-]?(\d*\.)?\d+/);
  if (!numberMatch) return null;
  let numStr = numberMatch[0];
  i += numStr.length;
  let unitMatch = str.slice(i).match(/^[a-zA-Z%*]+/);
  let unit = "px";
  if (unitMatch) {
    unit = unitMatch[0];
    i += unit.length;
  }
  return {
    value: Number(numStr),
    unit,
    next: i,
  };
}

function parseOperator(str: string, i: number) {
  const op = str[i];
  if (/[+\-*/]/.test(op)) {
    return {
      value: op,
      unit: "",
      next: i + 1,
    };
  }
  return null;
}

// Helper: parse a function (min/max/clamp/calc)
function parseFunction(
  str: string,
  i: number
): { value: any; unit: any; next: number } | null {
  let funcMatch = str.slice(i).match(/^(min|max|clamp|calc|minmax)\(/i);
  if (!funcMatch) return null;
  let funcName = funcMatch[1].toLowerCase();
  i += funcName.length + 1; // skip function name and '('
  let values: any[] = [];
  let units: any[] = [];
  while (i < str.length) {
    i = skipSpaces(str, i);
    // Parse argument (could be function or number+unit)
    let arg;
    if (/^(min|max|clamp|calc|minmax)\(/i.test(str.slice(i))) {
      arg = parseFunction(str, i);
    } else {
      arg = parseNumberUnit(str, i) || parseOperator(str, i);
    }
    if (!arg) break;
    values.push(arg.value);
    units.push(arg.unit);
    i = arg.next;
    i = skipSpaces(str, i);
    if (str[i] === ",") {
      i++;
      continue;
    } else if (str[i] === ")") {
      i++;
      break;
    }
  }
  return {
    value: { type: funcName, values },
    unit: { units },
    next: i,
  };
}

// Main: split by spaces/columns (outer, not inside parens)
function splitOuter(str: string): string[] {
  let result: string[] = [];
  let buf = "";
  let depth = 0;
  for (let i = 0; i < str.length; i++) {
    let c = str[i];
    if (c === "(") depth++;
    if (c === ")") depth--;
    if ((c === " " || c === ",") && depth === 0) {
      if (buf.trim()) result.push(buf.trim());
      buf = "";
    } else {
      buf += c;
    }
  }
  if (buf.trim()) result.push(buf.trim());
  return result;
}

function getMaxValue(
  params: MaxValueParams
): [IFluidValue | IFluidValue[], number] | null {
  const {
    index,
    batches,
    property,
    selector,
    batch: { width },
  } = params;

  for (let i = index + 1; i < batches.length; i++) {
    const nextBatch = batches[i];

    if (!nextBatch.isMediaQuery) break;

    if (nextBatch.isMediaQuery && nextBatch.width > width) {
      for (const nextRule of nextBatch.rules) {
        if (nextRule instanceof CSSStyleRule) {
          if (splitSelector(nextRule.selectorText).includes(selector)) {
            const nextValue = nextRule.style.getPropertyValue(property);
            if (nextValue) {
              const parsedValue = parseFluidValue(nextValue, property);
              if (parsedValue) return [parsedValue, nextBatch.width];
            }
          }
        }
      }
    }
  }

  return null;
}
