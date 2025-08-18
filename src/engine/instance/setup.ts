import {
  DeepReadonly,
  FluidRangeMetaData,
  IFluidBreakpointRange,
} from "../../index.types";
import { IFluidProperty, InsertFluidPropertyParams } from "../engine.types";
import { FluidProperty } from "../fluidProperty";
import { allElements, getState, intersectionObserver } from "./state";

/** Add elements to activate automatic fluid interpolation on them. */
export function addElements(els: HTMLElement[]): void {
  for (const el of els) {
    if (allElements.includes(el)) continue;

    el.mainFluidProperties = {};

    const classes = Array.from(el.classList);

    for (const klass of classes) processAnchorFluidRanges(el, klass);

    if (el.id) {
      processAnchorFluidRanges(el, el.id);
    }

    processAnchorFluidRanges(el, el.tagName.toLowerCase());

    if (!el.fluidProperties) return;
    sortFluidProperties(el.fluidProperties);

    allElements.push(el);
    intersectionObserver.observe(el);
  }
}

function processAnchorFluidRanges(el: HTMLElement, anchor: string) {
  const { fluidRangesByAnchor, breakpoints } = getState();

  const fluidRangesBySelector = fluidRangesByAnchor[anchor];

  if (fluidRangesBySelector) {
    for (const entry of Object.entries(fluidRangesBySelector)) {
      processFluidRangesForSelector(el, entry, breakpoints);
    }
  }
}

function processFluidRangesForSelector(
  el: HTMLElement,
  entry: [
    string,
    readonly [
      DeepReadonly<FluidRangeMetaData>,
      readonly DeepReadonly<IFluidBreakpointRange>[]
    ]
  ],
  breakpoints: readonly number[]
) {
  const [selector, [metaData, fluidRanges]] = entry;
  const { dynamicSelector, property, orderID } = metaData;
  if (
    isAMainFluidProperty(dynamicSelector) &&
    currentMainFluidPropertyIsHigherOrder(el, property, orderID)
  )
    return; //Performance optimization: if this is a static main fluid property, we only want to keep the highest order one.

  if (el.matches(selector)) {
    //If the element matches the base selector, we insert the fluid property.
    const state: InsertFluidPropertyParams = {
      el,
      metaData,
      fluidRanges,
      breakpoints,
    };
    insertFluidProperty(state);
  }
}

function isAMainFluidProperty(dynamicSelector: string | undefined): boolean {
  if (dynamicSelector) return false;
  return true;
}

function currentMainFluidPropertyIsHigherOrder(
  el: HTMLElement,
  property: string,
  orderID: number
): boolean {
  const mainFluidProperty = el.mainFluidProperties?.[property] || null;
  if (mainFluidProperty && orderID < mainFluidProperty.metaData.orderID)
    return true;
  return false;
}

function insertFluidProperty(state: InsertFluidPropertyParams): void {
  const { el, metaData, fluidRanges, breakpoints } = state;

  const fluidBreakpoints = new Array(breakpoints.length);
  for (const fluidRange of fluidRanges)
    fluidBreakpoints[fluidRange.minIndex] = fluidRange;
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

  if (metaData.dynamicSelector) return;
  el.mainFluidProperties![metaData.property] = fluidProperty;
}

function sortFluidProperties(
  fluidProperties: IFluidProperty[]
): IFluidProperty[] {
  const priorityProps = new Set(["font-size", "line-height"]);

  return fluidProperties.sort((a, b) => {
    // 1. Sort by orderID (descending)
    if (a.metaData.orderID !== b.metaData.orderID) {
      return b.metaData.orderID - a.metaData.orderID;
    }

    // 2. If same orderID, prioritize font-size / line-height
    const aPriority = priorityProps.has(a.metaData.property);
    const bPriority = priorityProps.has(b.metaData.property);

    if (aPriority && !bPriority) return -1;
    if (bPriority && !aPriority) return 1;

    // 3. Otherwise keep original order
    return 0;
  });
}
