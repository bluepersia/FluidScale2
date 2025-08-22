import { IFluidValue, Function, FunctionUnits } from "../../index.types";
import { ComputationParams } from "../engine.types";
import { PROPERTY_REDIRECTS } from "../shared";
import { FluidValueComputationState } from "./computation.types";
import { convertToPixels } from "./unitsConversion";

export function computeFluidValue(
  fluidValue: IFluidValue | (IFluidValue | ",")[],
  state: ComputationParams
): number | string | (number | string)[] {
  const { el, property } = state;
  const isSingleValue = !Array.isArray(fluidValue);
  if (isSingleValue) {
    if (
      (property === "grid-template-columns" ||
        property === "grid-template-rows") &&
      typeof fluidValue.value === "string"
    )
      return computeGridTemplateValue(el, property, fluidValue.value);

    return computeValue(fluidValue.value, fluidValue.unit, state);
  } else {
    return fluidValue.map((value) => {
      if (value === ",") return value;
      return computeValue(value.value, value.unit, state);
    });
  }
}

function computeGridTemplateValue(
  el: HTMLElement,
  property: string,
  value: string
): number[] {
  const prevValue = el.style.getPropertyValue(property);
  el.style.setProperty(property, value);

  const computedStyle = window.getComputedStyle(el);
  const gridTemplate = computedStyle.getPropertyValue(property);
  el.style.setProperty(property, prevValue);
  const gridTemplateArray = gridTemplate.split(" ");
  const gridTemplateValues = gridTemplateArray.map((value) => {
    return parseFloat(value);
  });
  return gridTemplateValues;
}

function computeValue(
  value: number | Function | string,
  unit: string | FunctionUnits,
  computationState: FluidValueComputationState
): number | string {
  if (typeof value === "number" && typeof unit === "string") {
    return convertToPixels(value, unit, computationState);
  }

  if (typeof value === "string") {
    const { el, property } = computationState;
    return measureKeywordValue(
      el,
      PROPERTY_REDIRECTS.get(property) || property,
      value
    );
  }
  if (typeof value === "object" && typeof unit === "object") {
    return computeCalc(value, unit, computationState);
  }

  throw new Error(`Unknown value or unit: ${value} ${unit}`);
}

function measureKeywordValue(
  el: HTMLElement,
  property: string,
  keyword: string
): number | string {
  if (property.startsWith("margin-") && keyword === "auto") return "auto";

  const prevValue = el.style.getPropertyValue(property);
  el.style.setProperty(property, keyword);

  const px = window.getComputedStyle(el).getPropertyValue(property);

  el.style.setProperty(property, prevValue);

  return parseFloat(px) || px;
}

function computeCalc(
  calc: Function,
  unit: FunctionUnits,
  state: FluidValueComputationState
): number {
  if (calc.type === "calc") return evaluateCalc(calc.values, unit.units, state);

  const values = calc.values.map((value, index) => {
    value = computeValue(value, unit.units[index], state);
    if (value === "none") throw Error("None in calc");

    return value as number;
  });

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
  values: (string | number | Function)[],
  units: (string | FunctionUnits)[],
  state: FluidValueComputationState
): number {
  const expression = values
    .map((value, index) => {
      if (value === "none") throw Error("None in calc");
      if (typeof value === "string" && isArithmetic(value)) return value;

      return computeValue(value, units[index], state);
    })
    .join("");

  if (!/^[\d+\-*/().\s]+$/.test(expression)) {
    console.log(expression);
    throw new Error("Unsafe expression");
  }

  return new Function(`return (${expression})`)();
}
