import { IConfig, IState } from "../engine.types";
import { handleIntersection, handleResize } from "./observers";
import { FluidRangesByAnchor } from "../../index.types";

const state: IState = {
  fluidRangesByAnchor: {},
  breakpoints: [],
  stableWindowWidth: getStableWindowWidth(),
  stableWindowHeight: getStableWindowHeight(),
  isMutationObserverInitialized: false,
  isIntersectionObserverInitialized: false,
};

function getState(): Readonly<IState> {
  return state;
}

const config: IConfig = {
  emMode: "linear",
};

const allElements: Element[] = [];
const computedStyleCache: Map<HTMLElement, CSSStyleDeclaration> = new Map();
const boundingClientRectCache: Map<HTMLElement, DOMRect> = new Map();

const intersectionObserver: IntersectionObserver = new IntersectionObserver(
  handleIntersection,
  {
    root: null,
    rootMargin: "100%",
    threshold: 0,
  }
);

const resizeObserver: ResizeObserver = new ResizeObserver(handleResize);

/** Elements that entered the viewport, and get fluidly updated each frame. */
const visibleElements: Set<HTMLElement> = new Set();
/** Elements that exited the viewport, and are in the queue to get flushed back to their default values in the next frame update. */
const pendingHiddenElements: Set<HTMLElement> = new Set();

function setInitState(
  fluidRangesByAnchor: FluidRangesByAnchor,
  breakpoints: number[],
  contextKey?: unknown
) {
  if (contextKey === "engineInitializationToken") {
    state.fluidRangesByAnchor = fluidRangesByAnchor;
    state.breakpoints = breakpoints;
  }
}

function setStableWindowState(contextKey?: unknown) {
  if (contextKey === "stableWindowWidthUpdateToken") {
    state.stableWindowWidth = getStableWindowWidth();
    state.stableWindowHeight = getStableWindowHeight();
  }
}

function setMutationObserverState(contextKey?: unknown) {
  if (contextKey === "mutationObserverInitializationToken") {
    state.isMutationObserverInitialized = true;
  }
}

function setIntersectionObserverState(contextKey?: unknown) {
  if (contextKey === "intersectionObserverInitializationToken") {
    state.isIntersectionObserverInitialized = true;
  }
}

function getComputedStyle(el: HTMLElement): CSSStyleDeclaration {
  if (computedStyleCache.has(el)) {
    return computedStyleCache.get(el) as CSSStyleDeclaration;
  }
  const computedStyle = window.getComputedStyle(el);
  computedStyleCache.set(el, computedStyle);
  return computedStyle;
}

function getBoundingClientRect(el: HTMLElement): DOMRect {
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

export {
  getState,
  config,
  allElements,
  intersectionObserver,
  resizeObserver,
  visibleElements,
  pendingHiddenElements,
  setInitState,
  setStableWindowState,
  setMutationObserverState,
  setIntersectionObserverState,
  getComputedStyle,
  getBoundingClientRect,
  computedStyleCache,
  boundingClientRectCache,
  getStableWindowWidth,
  getStableWindowHeight,
};
