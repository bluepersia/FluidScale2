import { FluidPropertyState } from "../engine.types";
import { removeElement } from "./setup";
import {
  boundingClientRectCache,
  computedStyleCache,
  getState,
  setStableWindowState,
  resizeObserver,
  resetCachesForEl,
} from "./state";
import { PROPERTY_REDIRECTS } from "../shared";

let updateTime: number = performance.now();
function update(): void {
  const { pendingHiddenElements, visibleElements } = getState();
  updateTime = performance.now();

  setStableWindowState("stableWindowWidthUpdateToken");

  for (const el of pendingHiddenElements) {
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

function updateElement(el: HTMLElement): void {
  if (!el.isConnected) {
    removeElement(el);
    return;
  }

  if (el.updateTime === updateTime) return;
  el.updateTime = updateTime;

  if (el.fluidProperties) {
    if (el.isVisible) {
      for (const fluidProperty of el.fluidProperties) {
        fluidProperty.update();
      }

      el.updateWidth = window.innerWidth;
    } else {
      el.updateWidth = undefined; //Reset for hidden elements. It's at default values, so the last update width is based on stale values
    }
  }

  if (el.states) {
    for (const state of el.states) {
      applyState(el, state);
    }
  }
}

function applyState(el: HTMLElement, state: FluidPropertyState): void {
  const { value, appliedState } = state;

  const appliedValue = appliedState?.value || undefined;

  const isValueNew = value !== appliedValue;
  if (isValueNew) styleUpdate(el, state);

  //Reset
  state.value = "";
  state.orderID = -1;
  state.fluidProperty = null;
  state.calcedSizePercentEl = undefined;
}

function styleUpdate(el: HTMLElement, state: FluidPropertyState): void {
  const { property } = state;

  const absentInlineStyle =
    !el.inlineStyleBatches ||
    el.inlineStyleBatches.length === 0 ||
    !el.inlineStyleBatches.find((batch) => batch[property]);

  if (absentInlineStyle) {
    applyStyle(el, PROPERTY_REDIRECTS.get(property) || property, state);
  }
}

function applyStyle(
  el: HTMLElement,
  property: string,
  state: FluidPropertyState
): void {
  const { value, fluidProperty, orderID, calcedSizePercentEl } = state;

  if (value) {
    el.style.setProperty(property, value);
  } else {
    el.style.removeProperty(property);
  }

  if (fluidProperty) {
    state.appliedState = {
      value,
      fluidProperty,
      orderID,
      calcedSizePercentEl,
    };
  }
  handleCalcSizePercent(calcedSizePercentEl);

  //We just set some styles on the style object, so we want to force recomputing style/rect
  resetCachesForEl(el);
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

function applyStateForProperty(el: HTMLElement, property: string): void {
  const state = el.statesByProperty?.[property];
  if (state?.fluidProperty) applyState(el, state);
}

export { update, updateElement, applyStateForProperty };
