import { FluidRangesByAnchor } from "./index.types";
import { parseDocument } from "./parse/stylesheet";
import { IFluidProperty, FluidPropertyState } from "./engine/engine.types";
import { FluidProperty } from "./engine/fluidProperty";

declare global {
  interface HTMLElement {
    fluidProperties?: IFluidProperty[];
    states?: FluidPropertyState[];
    statesByProperty?: { [property: string]: FluidPropertyState };
    isHidden?: boolean;
  }
}

let fluidRangesByAnchor: FluidRangesByAnchor = {};
export let breakpoints: number[] = [];
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
const activeElements: Set<HTMLElement> = new Set();
const inactiveElements: Set<HTMLElement> = new Set();

let isMutationObserverInitialized = false;

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

function handleIntersection(entries: IntersectionObserverEntry[]): void {
  for (const entry of entries) {
    if (entry.target instanceof HTMLElement) {
      if (entry.isIntersecting) {
        entry.target.isHidden = false;
        activeElements.add(entry.target);
        inactiveElements.delete(entry.target);
      } else {
        entry.target.isHidden = true;
        activeElements.delete(entry.target);
        inactiveElements.add(entry.target);
      }
    }
  }
}

export default function init(): void {
  const parsedDocument = parseDocument(document);
  if (parsedDocument) {
    fluidRangesByAnchor = parsedDocument.fluidRangesByAnchor;
    breakpoints = parsedDocument.breakpoints;
  }
  initMutationObserver();
  addElements([
    document.body,
    ...Array.from(document.body.querySelectorAll("*")).filter(
      (el) => el instanceof HTMLElement
    ),
  ]);
  requestAnimationFrame(update);
}

function initMutationObserver(): void {
  if (isMutationObserverInitialized) return;
  isMutationObserverInitialized = true;

  const observer = new MutationObserver((mutations) => {
    const addedNodes: HTMLElement[] = [];

    for (const mutation of mutations) {
      for (const addedNode of Array.from(mutation.addedNodes)) {
        if (addedNode instanceof HTMLElement) {
          addedNodes.push(addedNode);
        }
      }
    }

    addElements(addedNodes);
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

function addElements(els: HTMLElement[]): void {
  for (const el of els) {
    if (allElements.includes(el)) continue;

    allElements.push(el);

    const classes = Array.from(el.classList);

    for (const klass of classes) processAnchorFluidRanges(el, klass);

    if (el.id) {
      processAnchorFluidRanges(el, el.id);
    }

    processAnchorFluidRanges(el, el.tagName.toLowerCase());

    intersectionObserver.observe(el);
  }
}

function update(): void {
  for (const el of inactiveElements) {
    updateElement(el);
  }

  inactiveElements.clear();

  for (const el of activeElements) {
    updateElement(el);
  }

  computedStyleCache.clear();
  requestAnimationFrame(update);
}

function updateElement(el: HTMLElement): void {
  if (!el.isConnected) {
    activeElements.delete(el);
    inactiveElements.add(el);
    return;
  }

  if (el.fluidProperties) {
    for (const fluidProperty of el.fluidProperties) {
      fluidProperty.update();
    }
  }
  if (el.states) {
    for (const state of el.states) {
      applyState(el, state);
    }
  }
}

function applyState(el: HTMLElement, state: FluidPropertyState): void {
  if (state.appliedValue !== state.value) {
    if (state.value) {
      el.style.setProperty(state.property, state.value);
      state.appliedValue = state.value;
    } else {
      el.style.removeProperty(state.property);
      state.appliedValue = "";
    }

    state.appliedWidth = window.innerWidth;
  }
  state.value = "";
}
function processAnchorFluidRanges(el: HTMLElement, anchor: string) {
  const fluidRangesBySelector = fluidRangesByAnchor[anchor];

  if (fluidRangesBySelector) {
    for (const [selector, [metaData, fluidRanges]] of Object.entries(
      fluidRangesBySelector
    )) {
      if (el.matches(selector)) {
        const fluidBreakpoints = new Array(breakpoints.length);
        for (const fluidRange of fluidRanges)
          fluidBreakpoints[fluidRange.breakpointIndex] = fluidRange;
        const fluidPropertyConfig = {
          el,
          fluidBreakpoints,
          metaData,
        };
        const fluidProperty = new FluidProperty(fluidPropertyConfig);

        if (!el.fluidProperties) {
          el.fluidProperties = [];
        }

        el.fluidProperties.push(fluidProperty);
      }
    }
  }
}
