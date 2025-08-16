import { IComputationState } from "../engine.types";
import { getComputedStyle } from "../../index";
import { getBoundingClientRect } from "../../index";
import { parsePxString } from "./computation";

export function calcEmValue(
  value: number,
  computationState: IComputationState
): number {
  const { el, property } = computationState;
  if (property === "font-size") {
    return emElementLoop(value, computationState, el.parentElement);
  } else {
    return emElementLoop(value, computationState, el);
  }
}

function emElementLoop(
  value: number,
  state: IComputationState,
  el: HTMLElement | null
): number {
  let result;

  if (el) result = emProcessEl(value, state, el);

  while (result === null && el?.parentElement) {
    result = emProcessEl(value, state, el.parentElement);
  }

  if (result) return result;

  return (
    value *
    parsePxString(getComputedStyle(window.document.documentElement).fontSize)
  );
}

function emProcessEl(
  value: number,
  state: IComputationState,
  el: HTMLElement
): number | undefined {
  const { minBreakpoint, maxBreakpoint } = state;
  const statesByProperty = el.statesByProperty;
  if (statesByProperty) {
    let fontSizeState = statesByProperty["font-size"];
    if (fontSizeState && fontSizeState.fluidProperty) {
      const fontSizeFluidProperty = fontSizeState.fluidProperty;
      let fontSizeValue = fontSizeFluidProperty.computeValueForWidth(
        minBreakpoint,
        {
          minBreakpoint: minBreakpoint,
          maxBreakpoint: maxBreakpoint,
        }
      );
      if (Array.isArray(fontSizeValue)) {
        fontSizeValue = fontSizeValue[0];
      }
      if (fontSizeValue === null) return;

      return fontSizeValue * value;
    }
  }
}

export function calcPercentValue(
  value: number,
  computationState: IComputationState
): number {
  const { el, property } = computationState;

  const parent = el.parentElement || document.documentElement;

  switch (property) {
    case "width":
    case "left":
    case "right":
    case "margin-left":
    case "margin-right":
    case "padding-left":
    case "padding-right":
      return calcHorizontalPercentValue(value, parent);

    case "height":
    case "top":
    case "bottom":
    case "margin-top":
    case "margin-bottom":
    case "padding-top":
    case "padding-bottom":
      return calcVerticalPercentValue(value, parent);

    case "font-size":
      return calcFontSizePercentValue(value, parent);

    case "line-height":
      return calcLineHeightPercentValue(value, el);
  }
  throw new Error(`Unknown percentage property: ${property}`);
}

function calcHorizontalPercentValue(
  value: number,
  parent: HTMLElement
): number {
  const parentRect = getBoundingClientRect(parent);
  const parentStyle = getComputedStyle(parent);
  const [paddingLeft, paddingRight] = [
    parsePxString(parentStyle.paddingLeft),
    parsePxString(parentStyle.paddingRight),
  ];
  const parentWidth = parentRect.width - paddingLeft - paddingRight;
  return (value / 100) * parentWidth;
}

function calcVerticalPercentValue(value: number, parent: HTMLElement): number {
  const parentRect = getBoundingClientRect(parent);
  const parentStyle = getComputedStyle(parent);
  const [paddingTop, paddingBottom] = [
    parsePxString(parentStyle.paddingTop),
    parsePxString(parentStyle.paddingBottom),
  ];
  const parentHeight = parentRect.height - paddingTop - paddingBottom;
  return (value / 100) * parentHeight;
}

function calcFontSizePercentValue(value: number, parent: HTMLElement): number {
  const parentStyle = getComputedStyle(parent);
  const parentFontSize = parsePxString(parentStyle.fontSize);
  return (value / 100) * parentFontSize;
}

function calcLineHeightPercentValue(value: number, el: HTMLElement): number {
  const elStyle = getComputedStyle(el);
  const elFontSize = parsePxString(elStyle.fontSize);
  return (value / 100) * elFontSize;
}
