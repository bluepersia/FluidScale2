import { IFluidRange, FluidPropertyData } from "../../index.types";
import {
  FluidRangeParams,
  FluidRangesParams,
  WriteFluidPropertyParams,
  MakeFluidPropertyDataParams,
} from "../parse.types";
import { makeValueIndexMap, parseLocks } from "../specialCases";

const DYNAMIC_PSEUDO_SELECTOR_REGEX =
  /:hover|:focus|:active|:visited|:disabled|:checked|:focus-visible|:focus-within/g;

export function makeFluidRange(params: FluidRangeParams): IFluidRange {
  const {
    batch: { width },
    breakpoints,
    maxValueBatchWidth,
    minValue,
    maxValue,
  } = params;

  const fluidRange: IFluidRange = {
    minValue,
    maxValue,
    minIndex: breakpoints.indexOf(width),
    maxIndex: breakpoints.indexOf(maxValueBatchWidth),
  };

  addOptionalCases(fluidRange, params);

  return fluidRange;
}

function addOptionalCases(
  fluidRange: IFluidRange,
  params: FluidRangeParams
): void {
  const { lockVarValue, property, minValue, maxValue } = params;

  const locks = parseLocks(lockVarValue, property);
  const valueIndexMap = makeValueIndexMap(property, minValue, maxValue);

  if (locks) {
    fluidRange.locks = locks;
  }
  if (valueIndexMap) {
    fluidRange.valueIndexMap = valueIndexMap;
  }
}

export function getMakeFluidRanges(params: FluidRangesParams): IFluidRange[] {
  const { selector, isMarkedAsDynamic } = params;

  const isDynamicPseudo =
    DYNAMIC_PSEUDO_SELECTOR_REGEX.test(selector) || isMarkedAsDynamic;
  const strippedSelector = isDynamicPseudo
    ? stripModifiers(selector)
    : selector;
  const dynamicSelector = strippedSelector === selector ? undefined : selector;

  const selectorSegments = strippedSelector.split(" ");
  const anchor = selectorSegments[selectorSegments.length - 1];

  const fluidPropertyData = getMakeFluidProperty({
    ...params,
    anchor,
    strippedSelector,
    dynamicSelector,
  });

  return fluidPropertyData[1];
}

function getMakeFluidProperty(
  params: WriteFluidPropertyParams
): FluidPropertyData {
  const { fluidRangesByAnchor, anchor, strippedSelector, property } = params;

  let fluidRangesBySelector = fluidRangesByAnchor[anchor];

  if (!fluidRangesBySelector) {
    fluidRangesByAnchor[anchor] = fluidRangesBySelector = {};
  }
  let fluidProperties = fluidRangesBySelector[strippedSelector];
  if (!fluidProperties) {
    fluidRangesBySelector[strippedSelector] = fluidProperties = {};
  }
  let fluidPropertyData =
    fluidProperties[property] ||
    makeFluidPropertyData({ ...params, fluidProperties });
  return fluidPropertyData;
}

function makeFluidPropertyData(
  params: MakeFluidPropertyDataParams
): FluidPropertyData {
  const { fluidProperties, property, order, dynamicSelector } = params;

  const fluidPropertyData = (fluidProperties[property] = [
    { orderID: order, dynamicSelector },
    [],
  ]);

  return fluidPropertyData;
}

function stripModifiers(selectorText: string): string {
  return (
    selectorText
      // remove BEM modifiers (anything starting with `--` until next non-name char)
      .replace(/--[a-zA-Z0-9_-]+/g, "")
      // remove chained modifiers like .mod
      .replace(/\.[a-zA-Z0-9_-]+/g, "")
      // remove common dynamic pseudos
      .replace(
        /:(hover|focus|active|visited|disabled|checked|focus-visible|focus-within)/g,
        ""
      )
      .trim()
  );
}
