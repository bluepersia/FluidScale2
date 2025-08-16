import { Calc, CalcUnits, IFluidValue } from "../../index.types";
import { IComputationState } from "../engine.types";
import { IComputeFluidValueState } from "./computation.types";
import { calcEmValue, calcPercentValue } from "./unitsConversion";

export function computeValueForRange(
  state: IComputationState
): number | number[] {
  const { progress, fluidRange } = state;
  let valueResult: number | number[] | string;
  if (progress >= 1) {
    valueResult = computeFluidValue(fluidRange.maxValue, state, "max");
  } else {
    let minValuePx = computeFluidValue(fluidRange.minValue, state, "min");
    let maxValuePx = computeFluidValue(fluidRange.maxValue, state, "max");

    if (Array.isArray(minValuePx) || Array.isArray(maxValuePx)) {
      valueResult = calcValueArrayFromProgress(
        minValuePx,
        maxValuePx,
        progress
      );
    } else {
      valueResult = calcValueFromProgress(minValuePx, maxValuePx, progress);
    }
  }

  return valueResult;
}

function calcValueArrayFromProgress(
  minValue: number | number[],
  maxValue: number | number[],
  progress: number
): number[] {
  const minValuePxArray: number[] = Array.isArray(minValue)
    ? minValue
    : [minValue];
  const maxValuePxArray: number[] = Array.isArray(maxValue)
    ? maxValue
    : [maxValue];

  return minValuePxArray.map((value, index) => {
    const maxValue =
      maxValuePxArray.length > index
        ? maxValuePxArray[index]
        : maxValuePxArray[maxValuePxArray.length - 1];
    return calcValueFromProgress(value, maxValue, progress);
  });
}

function calcValueFromProgress(
  minValue: number,
  maxValue: number,
  progress: number
) {
  return minValue + (maxValue - minValue) * progress;
}

function computeFluidValue(
  fluidValue: IFluidValue | IFluidValue[],
  state: IComputationState,
  minOrMax: "min" | "max"
): number | number[] {
  const { el, property } = state;
  if (!Array.isArray(fluidValue)) {
    if (
      (property === "grid-template-columns" ||
        property === "grid-template-rows") &&
      typeof fluidValue.value === "string"
    )
      return computeGridTemplateValue(el, property, fluidValue.value);

    return computeValue(fluidValue.value, fluidValue.unit, {
      ...state,
      minOrMax,
    });
  } else {
    return fluidValue.map((value) => {
      return computeValue(value.value, value.unit, { ...state, minOrMax });
    });
  }
}

function computeGridTemplateValue(
  el: HTMLElement,
  property: string,
  value: string
): number[] {
  el.style.setProperty(property, value);

  const computedStyle = window.getComputedStyle(el);
  const gridTemplate = computedStyle.getPropertyValue(property);
  const gridTemplateArray = gridTemplate.split(" ");
  const gridTemplateValues = gridTemplateArray.map((value) => {
    return parseFloat(value);
  });
  return gridTemplateValues;
}

function computeValue(
  value: number | Calc | string,
  unit: string | CalcUnits,
  computationState: IComputeFluidValueState
): number {
  if (typeof value === "number" && typeof unit === "string") {
    return convertToPixels(value, unit, computationState);
  }

  if (typeof value === "string") {
    const { el, property } = computationState;
    return measureKeywordValue(el, property, value);
  }
  if (typeof value === "object" && typeof unit === "object") {
    return computeCalc(value, unit, computationState);
  }

  throw new Error(`Unknown value or unit: ${value} ${unit}`);
}

function convertToPixels(
  value: number,
  unit: string,
  computationState: IComputeFluidValueState
): number {
  switch (unit) {
    case "px":
      return value;
    case "em":
      return calcEmValue(value, computationState);
    case "rem":
      return (
        value *
        parseFloat(getComputedStyle(window.document.documentElement).fontSize)
      );
    case "%":
      return calcPercentValue(value, computationState);
  }

  return value;
}

function measureKeywordValue(
  element: HTMLElement,
  property: string,
  keyword: string
): number {
  element.style.setProperty(property, keyword);

  // 6. Measure
  let value: number;
  if (property === "width" || property === "height") {
    value = element.getBoundingClientRect()[property];
  } else {
    const px = window.getComputedStyle(element).getPropertyValue(property);
    value = parseFloat(px) || 0;
  }

  return value;
}

function computeCalc(
  calc: Calc,
  unit: CalcUnits,
  state: IComputeFluidValueState
): number {
  if (calc.type === "calc") return evaluateCalc(calc.values, unit.units, state);

  const values = calc.values.map((value, index) =>
    computeValue(value, unit.units[index], state)
  );
  switch (calc.type) {
    case "min":
      return Math.min(...values);
    case "max":
      return Math.max(...values);
    case "clamp":
      return Math.max(Math.min(values[0], values[1]), values[2]);
    case "minmax":
      return Math.min(Math.max(values[0], values[1]), values[2]);
  }
  throw new Error(`Unknown calc type: ${calc.type}`);
}

function isArithmetic(value: string): boolean {
  return value === "+" || value === "-" || value === "*" || value === "/";
}

function evaluateCalc(
  values: (string | number | Calc)[],
  units: (string | CalcUnits)[],
  state: IComputeFluidValueState
): number {
  const expression = values
    .map((value, index) => {
      if (typeof value === "string" && isArithmetic(value)) return value;

      return computeValue(value, units[index], state);
    })
    .join("");

  if (!/^[\d+\-*/().\s]+$/.test(expression)) {
    throw new Error("Unsafe expression");
  }

  return new Function(`return (${expression})`)();
}
