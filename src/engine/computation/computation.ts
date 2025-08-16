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
  if (Array.isArray(fluidValue)) {
    return fluidValue.map((value) => {
      return computeValue(value.value, value.unit, { ...state, minOrMax });
    });
  } else {
    return computeValue(fluidValue.value, fluidValue.unit, {
      ...state,
      minOrMax,
    });
  }
}

function computeValue(
  value: number | Calc,
  unit: string | CalcUnits,
  computationState: IComputeFluidValueState
): number {
  if (typeof value === "number" && typeof unit === "string") {
    return convertToPixels(value, unit, computationState);
  }

  if (typeof value === "object" && typeof unit === "object") {
    return computeCalc(value, unit, computationState);
  }

  return 0;
}

function convertToPixels(
  value: number,
  unit: string,
  computationState: IComputationState
): number {
  switch (unit) {
    case "px":
      return value;
    case "em": {
      return calcEmValue(value, computationState);
    }
    case "rem":
      return (
        value *
        parsePxString(
          getComputedStyle(window.document.documentElement).fontSize
        )
      );
    case "%":
      return calcPercentValue(value, computationState);
  }

  return value;
}

export function parsePxString(value: string): number {
  const match = value.match(/(\d+)([a-z]+)/);
  if (!match) return 0;
  return Number(match[1]);
}

function computeCalc(
  calc: Calc,
  unit: CalcUnits,
  state: IComputeFluidValueState
): number {
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
