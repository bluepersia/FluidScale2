import { FluidValueComputationState } from "./computation.types";
import { getBoundingClientRect, getState } from "../instance/state";
import { applyStateForProperty, updateElement } from "../instance/update";

export function convertToPixels(
  value: number,
  unit: string,
  computationState: FluidValueComputationState
): number {
  const { el } = computationState;
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
    case "vw":
      return (value / 100) * window.innerWidth;
    case "vh":
      return (value / 100) * window.innerHeight;
    case "vmin":
      return (value / 100) * Math.min(window.innerWidth, window.innerHeight);
    case "vmax":
      return (value / 100) * Math.max(window.innerWidth, window.innerHeight);
    case "cm":
      return (value * 96) / 2.54; // 1in = 2.54cm, 1in = 96px
    case "mm":
      return (value * 96) / 25.4; // 1in = 25.4mm
    case "in":
      return value * 96;
    case "pt":
      return (value * 96) / 72; // 1pt = 1/72in
    case "pc":
      return (value * 96) / 6; // 1pc = 12pt = 1/6in
    case "q":
      return (value * 96) / 25.4 / 4; // 1q = 1/4mm
    case "ex":
      return calcGlyph(el, value, "x");
    case "ch":
      return calcGlyph(el, value, "0");
    case "lh":
      return calcLineHeight(el, value);
    case "rlh":
      return calcLineHeight(window.document.documentElement, value);
    case "dvw":
      return (value / 100) * getState().stableWindowWidth;
    case "dvh":
      return (value / 100) * getState().stableWindowHeight;
    case "dvmin":
      return (
        (value / 100) *
        Math.min(getState().stableWindowWidth, getState().stableWindowHeight)
      );
    case "dvmax":
      return (
        (value / 100) *
        Math.max(getState().stableWindowWidth, getState().stableWindowHeight)
      );
  }

  return value;
}

export function calcEmValue(
  value: number,
  computationState: FluidValueComputationState
): number {
  const { el, property } = computationState;
  if (property === "font-size") {
    const parent = el.parentElement || document.documentElement;
    updateElement(parent);
    return value * parseFloat(getComputedStyle(parent).fontSize);
  } else {
    applyStateForProperty(el, "font-size");
    return value * parseFloat(getComputedStyle(el).fontSize);
  }
}

export function calcPercentValue(
  value: number,
  computationState: FluidValueComputationState
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
    case "border-left-width":
    case "border-right-width":
      el.calcedSizePercentEl = parent;
      return calcHorizontalPercentValue(value, parent);

    case "height":
    case "top":
    case "bottom":
    case "margin-top":
    case "margin-bottom":
    case "padding-top":
    case "padding-bottom":
    case "border-top-width":
    case "border-bottom-width":
      el.calcedSizePercentEl = parent;
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
  updateElement(parent);
  const parentRect = getBoundingClientRect(parent);
  const parentStyle = getComputedStyle(parent);
  const [paddingLeft, paddingRight] = [
    parseFloat(parentStyle.paddingLeft),
    parseFloat(parentStyle.paddingRight),
  ];
  const parentWidth = parentRect.width - paddingLeft - paddingRight;
  return (value / 100) * parentWidth;
}

function calcVerticalPercentValue(value: number, parent: HTMLElement): number {
  updateElement(parent);
  const parentRect = getBoundingClientRect(parent);
  const parentStyle = getComputedStyle(parent);
  const [paddingTop, paddingBottom] = [
    parseFloat(parentStyle.paddingTop),
    parseFloat(parentStyle.paddingBottom),
  ];
  const parentHeight = parentRect.height - paddingTop - paddingBottom;
  return (value / 100) * parentHeight;
}

function calcFontSizePercentValue(value: number, parent: HTMLElement): number {
  updateElement(parent);
  const parentStyle = getComputedStyle(parent);
  const parentFontSize = parseFloat(parentStyle.fontSize);
  return (value / 100) * parentFontSize;
}

function calcLineHeightPercentValue(value: number, el: HTMLElement): number {
  const elStyle = getComputedStyle(el);
  const elFontSize = parseFloat(elStyle.fontSize);
  return (value / 100) * elFontSize;
}

export function calcGlyph(
  el: HTMLElement,
  value: number,
  glyph: "x" | "0"
): number {
  const testEl = document.createElement("span");
  testEl.style.font = getComputedStyle(el).font;
  testEl.textContent = glyph;
  document.body.appendChild(testEl);
  const rect = testEl.getBoundingClientRect();
  const size = glyph === "x" ? rect.height : rect.width;
  document.body.removeChild(testEl);
  return value * size;
}

export function calcLineHeight(el: HTMLElement, value: number): number {
  applyStateForProperty(el, "line-height");
  return value * parseFloat(getComputedStyle(el).lineHeight);
}
