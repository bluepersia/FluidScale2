import { IFluidValue } from "../../index.types";

const TEXT_VALUES = [
  "auto",
  "inherit",
  "initial",
  "unset",
  "revert",
  "fit-content",
  "max-content",
  "min-content",
  "none",
];

const POSITION_VALUES_AS_PERCENT = {
  left: 0,
  right: 100,
  top: 0,
  bottom: 100,
  center: 50,
};

const FUNCTIONS_REGEX =
  /^(min|max|clamp|calc|minmax|rotate|rotateX|rotateY|rotateZ|skew|skewX|skewY|scale|scaleX|scaleY|scaleZ|translate|translateX|translateY|translateZ)\(/i;

export function parseFluidValue(
  value: string,
  property: string
): IFluidValue | (IFluidValue | ",")[] | null {
  if (!value || typeof value !== "string") return null;

  if (property === "grid-template-columns" || property === "grid-template-rows")
    return { value, unit: "" };

  let parts = splitOuter(value);

  if (property.startsWith("background-position-")) {
    const sets = splitByComma(parts);

    for (const [index, set] of sets.entries()) {
      if (set.length === 2) sets[index] = [`calc(${set[0]} + ${set[1]})`];
    }
    parts = joinWithComma(sets);
  }
  const results: (IFluidValue | ",")[] | [IFluidValue] = parseParts(parts);

  if (results.length === 0) return null;
  if (results.length === 1 && typeof results[0] === "object") return results[0];

  return results;
}

function joinWithComma<T>(parts: T[][]): (T | ",")[] {
  const result: (T | ",")[] = [];

  parts.forEach((group, index) => {
    if (index > 0) {
      result.push(","); // insert comma between groups
    }
    result.push(...group);
  });

  return result;
}

function splitByComma<T>(arr: T[]): T[][] {
  const result: T[][] = [];
  let current: T[] = [];

  for (const item of arr) {
    if (item === ("," as unknown as T)) {
      // Push current group if not empty
      result.push(current);
      current = [];
    } else {
      current.push(item);
    }
  }

  // Push the last group if any
  if (current.length > 0) {
    result.push(current);
  }

  return result;
}

function parseParts(parts: string[]): (IFluidValue | ",")[] {
  const results: (IFluidValue | ",")[] = [];
  for (let part of parts) {
    let i = 0;
    i = skipSpaces(part, i);
    let parsed: any = null;
    if (part === ",") {
      results.push(",");
      continue;
    }
    if (FUNCTIONS_REGEX.test(part.slice(i))) {
      parsed = parseFunction(part, i) || parseOperator(part, i);
    } else if (TEXT_VALUES.includes(part)) {
      parsed = { value: part, unit: "" };
    } else {
      parsed = parsePositionValue(part, i) || parseNumberUnit(part, i);
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
  let unit = "";
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

function parsePositionValue(str: string, i: number) {
  const valueSlice = str.slice(i);
  for (const [key, value] of Object.entries(POSITION_VALUES_AS_PERCENT)) {
    if (valueSlice.startsWith(key))
      return {
        value,
        unit: "%",
        next: i + key.length,
        addMinus: key === "right" || key === "bottom",
      };
  }
  return null;
}

// Helper: parse a function (min/max/clamp/calc)
function parseFunction(
  str: string,
  i: number
): { value: any; unit: any; next: number } | null {
  let funcMatch = str.slice(i).match(FUNCTIONS_REGEX);
  if (!funcMatch) return null;
  let funcName = funcMatch[1].toLowerCase();
  i += funcName.length + 1; // skip function name and '('
  let values: any[] = [];
  let units: any[] = [];
  while (i < str.length) {
    i = skipSpaces(str, i);
    // Parse argument (could be function or number+unit)
    let arg: { value: any; unit: any; next: number; addMinus?: boolean } | null;
    if (FUNCTIONS_REGEX.test(str.slice(i))) {
      arg = parseFunction(str, i);
    } else {
      const textValue = TEXT_VALUES.find(
        (value) => str.slice(i, i + value.length) === value
      );
      if (textValue)
        arg = {
          value: textValue,
          unit: "",
          next: i + textValue.length,
        };
      else
        arg =
          parsePositionValue(str, i) ||
          parseNumberUnit(str, i) ||
          parseOperator(str, i);
    }
    if (!arg) break;
    values.push(arg.value);
    units.push(arg.unit);
    if (arg.addMinus) {
      values.push("-");
      units.push("");
    }
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
      if (c === ",") result.push(",");
      buf = "";
    } else {
      buf += c;
    }
  }
  if (buf.trim()) result.push(buf.trim());
  return result;
}
