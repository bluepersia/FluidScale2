import { IConfig, IState } from "../engine.types";
import { handleIntersection, handleResize } from "./observers";
import { DeepReadonly, FluidRangesByAnchor } from "../../index.types";

const state: IState = {
  fluidRangesByAnchor: {},
  breakpoints: [],
  stableWindowWidth: getStableWindowWidth(),
  stableWindowHeight: getStableWindowHeight(),
  isMutationObserverInitialized: false,
  isIntersectionObserverInitialized: false,
};

export function getState(): DeepReadonly<IState> {
  return state;
}

export const config: IConfig = {
  emMode: "linear",
};

export const allElements: Element[] = [];
export const computedStyleCache: Map<HTMLElement, CSSStyleDeclaration> =
  new Map();
export const boundingClientRectCache: Map<HTMLElement, DOMRect> = new Map();

export const intersectionObserver: IntersectionObserver =
  new IntersectionObserver(handleIntersection, {
    root: null,
    rootMargin: "100%",
    threshold: 0,
  });

export const resizeObserver: ResizeObserver = new ResizeObserver(handleResize);

/** Elements that entered the viewport, and get fluidly updated each frame. */
export const visibleElements: Set<HTMLElement> = new Set();
/** Elements that exited the viewport, and are in the queue to get flushed back to their default values in the next frame update. */
export const pendingHiddenElements: Set<HTMLElement> = new Set();

export function setInitState(
  fluidRangesByAnchor: DeepReadonly<FluidRangesByAnchor>,
  breakpoints: readonly number[],
  contextKey?: unknown
) {
  if (contextKey === "engineInitializationToken") {
    state.fluidRangesByAnchor = fluidRangesByAnchor;
    state.breakpoints = breakpoints;
  }
}

export function setStableWindowState(contextKey?: unknown) {
  if (contextKey === "stableWindowWidthUpdateToken") {
    state.stableWindowWidth = getStableWindowWidth();
    state.stableWindowHeight = getStableWindowHeight();
  }
}

export function setMutationObserverState(contextKey?: unknown) {
  if (contextKey === "mutationObserverInitializationToken") {
    state.isMutationObserverInitialized = true;
  }
}

export function setIntersectionObserverState(contextKey?: unknown) {
  if (contextKey === "intersectionObserverInitializationToken") {
    state.isIntersectionObserverInitialized = true;
  }
}

export function getComputedStyle(el: HTMLElement): CSSStyleDeclaration {
  if (computedStyleCache.has(el)) {
    return computedStyleCache.get(el) as CSSStyleDeclaration;
  }
  const computedStyle = window.getComputedStyle(el);
  computedStyleCache.set(el, computedStyle);
  return computedStyle;
}

export function getBoundingClientRect(el: HTMLElement): DOMRect {
  if (boundingClientRectCache.has(el)) {
    return boundingClientRectCache.get(el) as DOMRect;
  }
  const boundingClientRect = el.getBoundingClientRect();
  boundingClientRectCache.set(el, boundingClientRect);
  return boundingClientRect;
}

function getStableWindowWidth(): number {
  return window.visualViewport?.width ?? window.innerWidth;
}

function getStableWindowHeight(): number {
  return window.visualViewport?.height ?? window.innerHeight;
}
