import { FluidPropertyState } from "../engine.types";
import {
  visibleElements as visibleElements,
  boundingClientRectCache,
  computedStyleCache,
  pendingHiddenElements as pendingHiddenElements,
  intersectionObserver,
  getState,
  setStableWindowState,
  resizeObserver,
} from "./state";

let updateTime: number = performance.now();
export function update(): void {
  updateTime = performance.now();

  setStableWindowState("stableWindowWidthUpdateToken");
  const stableWindowWidth = getState().stableWindowWidth;

  for (const el of pendingHiddenElements) {
    // If the window width is same since we last updated this element, we maintain the values that were set on last update. Flush is cancelled.
    if (windowWidthIsSameSinceLastElementUpdate(el, stableWindowWidth))
      continue;

    updateElement(el); //Flushes hidden element to its default value
    pendingHiddenElements.delete(el);
  }

  for (const el of visibleElements) {
    updateElement(el);
  }

  computedStyleCache.clear();
  boundingClientRectCache.clear();
  requestAnimationFrame(update);
}

/** If the stable window width didn't change since we updated this element, we don't re-update the element (style stays the same)
 */
export function windowWidthIsSameSinceLastElementUpdate(
  el: HTMLElement,
  stableWindowWidth: number
): boolean {
  if (el.updateWidth === undefined) return false;
  return Math.abs(el.updateWidth - stableWindowWidth) < 1;
}

export function updateElement(el: HTMLElement): void {
  if (!el.isConnected) {
    visibleElements.delete(el);
    pendingHiddenElements.delete(el);
    intersectionObserver.unobserve(el);
    return;
  }

  if (el.updateTime === updateTime) return;
  el.updateTime = updateTime;

  if (el.fluidProperties) updateFluidProperties(el);

  if (el.states) {
    for (const state of el.states) {
      applyState(el, state);
    }
  }
}

function updateFluidProperties(el: HTMLElement): void {
  if (el.isHidden) {
    /** If the element is considered hidden, we do not update the fluid state, and on next state apply, the style is kept at its default value */
    el.updateTime = undefined;
    return;
  }

  for (const fluidProperty of el.fluidProperties || []) {
    fluidProperty.update();
  }

  el.updateWidth = getState().stableWindowWidth;
}

function applyState(el: HTMLElement, state: FluidPropertyState): void {
  const { value, appliedState } = state;

  const appliedValue = appliedState?.value || undefined;

  if (appliedValue !== value) applyStyle(el, state); //If the value is a new one, apply it

  //Reset
  state.value = "";
  state.orderID = -1;
  state.fluidProperty = null;
  state.calcedSizePercentEl = undefined;
}

function applyStyle(el: HTMLElement, state: FluidPropertyState): void {
  const { value, property, fluidProperty, orderID, calcedSizePercentEl } =
    state;

  if (value) {
    el.style.setProperty(property, value);
  } else {
    el.style.removeProperty(property);
  }

  if (fluidProperty)
    state.appliedState = {
      value,
      fluidProperty,
      orderID,
      calcedSizePercentEl,
    };

  handleCalcSizePercent(calcedSizePercentEl);

  //We just set some styles on the style object, so we want to force recomputing style/rect
  computedStyleCache.delete(el);
  boundingClientRectCache.delete(el);
}

/** If the value was calced from parent size, its validity depends on the parent size.
 * Therefore, if the parent is resized, we need to re-compute the value.
 * We observe the parent for resize events, and set a flag on the parent to indicate that it has been resized.
 * This tells the fluid property to re-compute the value, instead of re-applying the last-applied-value
 */
function handleCalcSizePercent(
  calcedSizePercent: HTMLElement | undefined
): void {
  if (calcedSizePercent) {
    if (!calcedSizePercent.isObservingResize) {
      calcedSizePercent.isObservingResize = true;
      resizeObserver.observe(calcedSizePercent);
    }
    calcedSizePercent.isResized = false;
  }
}

export function applyStateForProperty(el: HTMLElement, property: string): void {
  const state = el.statesByProperty?.[property];
  if (state?.fluidProperty) applyState(el, state);
}
