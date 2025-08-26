import {
  Function,
  IFluidRangeComputation,
  IFluidValue,
} from "../../index.types";
import { ComputationParams } from "../engine.types";
import {
  CalcValueProgressParams,
  MinMaxArrayCalcParams,
  ValueArrayParams,
  ValueArrayParamsBase,
} from "./computation.types";
import { computeFluidValue } from "./fluidValue";

const GRAPHICS_FUNCTION_UNITS: Map<string, string> = new Map([
  ["rotate", "deg"],
  ["rotateX", "deg"],
  ["rotateY", "deg"],
  ["rotateZ", "deg"],
  ["skew", "deg"],
  ["skewX", "deg"],
  ["skewY", "deg"],
  ["scale", ""],
  ["scaleX", ""],
  ["scaleY", ""],
  ["scaleZ", ""],
  ["translate", "px"],
  ["translateX", "px"],
  ["translateY", "px"],
  ["translateZ", "px"],
]);

export function computeValueForRange(
  params: ComputationParams
): number | string | (number | string)[] {
  const { progress, fluidRange } = params;
  if (progress >= 1) {
    return computeFluidValue(fluidRange.maxValue, params);
  } else {
    return interpolateFluidValues(fluidRange, progress, params);
  }
}

function interpolateFluidValues(
  fluidRange: IFluidRangeComputation,
  progress: number,
  params: ComputationParams
): number | string | (number | string)[] {
  let minValue = computeFluidValue(fluidRange.minValue, params);

  if (fluidRange.locks === "all" || typeof minValue === "string") {
    return minValue;
  }

  let maxValue = computeFluidValue(fluidRange.maxValue, params);

  if (typeof maxValue === "string") return minValue;

  if (Array.isArray(minValue) || Array.isArray(maxValue)) {
    return calcValueArrayFromProgress({
      progress,
      ...makeValueArrayParams(minValue, maxValue, fluidRange),
    });
  }

  if (fluidRange.valueIndexMap && !fluidRange.valueIndexMap.has(0))
    return minValue;

  const calcType = getMinValueCalcTypes(fluidRange.minValue)[0];
  return calcValueFromProgress({ minValue, maxValue, progress, calcType });
}

function makeValueArrayParams(
  minValues: number | string | (number | string)[],
  maxValues: number | string | (number | string)[],
  fluidRange: IFluidRangeComputation
): ValueArrayParamsBase {
  return {
    minValues,
    maxValues,
    ...fluidRange,
    minValueCalcTypes: getMinValueCalcTypes(fluidRange.minValue),
    locks: fluidRange.locks === "all" ? undefined : fluidRange.locks,
  };
}

function getMinValueCalcTypes(
  minValue: IFluidValue | (IFluidValue | ",")[]
): (string | undefined)[] {
  minValue = Array.isArray(minValue) ? minValue : [minValue];

  return minValue.map((value) => {
    if (typeof value === "object") {
      return (value.value as Function).type;
    }
    return;
  });
}

function calcValueArrayFromProgress(
  params: ValueArrayParams
): (number | string)[] {
  const { minValues, maxValues } = params;

  let minValuesArr: (number | string)[] = Array.isArray(minValues)
    ? minValues
    : [minValues];

  const maxValuesArr: (number | string)[] = Array.isArray(maxValues)
    ? maxValues
    : [maxValues];

  return minValuesArr.map((minValue, index) =>
    minMaxArrayMap({
      ...params,
      minValuesArr,
      maxValuesArr,
      minValue,
      index,
    })
  );
}

function minMaxArrayMap(params: MinMaxArrayCalcParams): string | number {
  const {
    locks,
    valueIndexMap,
    minValueCalcTypes,
    minValue,
    index,
    progress,
    maxValuesArr,
  } = params;
  if (locks?.includes(index) || (valueIndexMap && !valueIndexMap.has(index))) {
    return minValue;
  }

  const maxValue = getMaxValue(index, maxValuesArr, valueIndexMap);
  if (!maxValue) return minValue;
  const calcType = minValueCalcTypes?.[index];
  return calcValueFromProgress({ minValue, maxValue, progress, calcType });
}

function getMaxValue(
  index: number,
  maxValuePxArray: (number | string)[],
  valueIndexMap?: Map<number, number>
): number | string | null {
  if (valueIndexMap) {
    const mappedIndex = valueIndexMap.get(index);
    if (!mappedIndex) return null;
    return maxValuePxArray[mappedIndex];
  }
  return maxValuePxArray.length > index
    ? maxValuePxArray[index]
    : maxValuePxArray[maxValuePxArray.length - 1];
}

function calcValueFromProgress(params: CalcValueProgressParams) {
  const { minValue, maxValue, progress, calcType } = params;

  if (typeof minValue === "string" || typeof maxValue === "string")
    return minValue;

  const value = minValue + (maxValue - minValue) * progress;

  if (calcType && GRAPHICS_FUNCTION_UNITS.has(calcType))
    return `${calcType}(${value}${GRAPHICS_FUNCTION_UNITS.get(calcType)})`;

  return value;
}
