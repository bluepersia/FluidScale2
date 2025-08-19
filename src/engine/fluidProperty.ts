import { IFluidRange } from "../index.types";
import { FluidRangeMetaData } from "../index.types";
import {
  IFluidProperty,
  FluidPropertyState,
  FluidPropertyConfig,
  ComputationParamsBase,
} from "./engine.types";
import { computeValueForRange } from "./computation/computation";
import { isWidthSame } from "../utils";

export class FluidProperty implements IFluidProperty {
  el: HTMLElement;
  fluidBreakpoints: (IFluidRange | null)[];
  metaData: FluidRangeMetaData;
  specialType: "grid" | "flex" | null;
  state: FluidPropertyState;

  constructor(config: FluidPropertyConfig) {
    this.el = config.el;
    this.fluidBreakpoints = config.fluidBreakpoints;
    this.metaData = config.metaData;
    this.specialType = this.metaData.property.startsWith("grid-")
      ? "grid"
      : this.metaData.property === "flex"
      ? "flex"
      : null;

    this.state = this.initState();
  }

  initState(): FluidPropertyState {
    if (!this.el.statesByProperty) this.el.statesByProperty = {};

    if (!this.el.statesByProperty[this.metaData.property]) {
      this.el.statesByProperty[this.metaData.property] = {
        property: this.metaData.property,
        value: "",
        orderID: -1,
        fluidProperty: null,
      };
    }

    return this.el.statesByProperty[this.metaData.property];
  }

  update(breakpoints: number[]): void {
    if (this.metaData.orderID < this.state.orderID) return; //Apply only the highest order fluid property

    //If this is a dynamic selector, we only want to apply it if it's actually active on the element
    if (
      this.metaData.dynamicSelector &&
      !this.el.matches(this.metaData.dynamicSelector)
    )
      return;

    if (this.repeatLastComputedValue()) return;

    this.el.calcedSizePercentEl = undefined;
    const value = this.getValueAsString(breakpoints);

    this.state.value = value;
    this.state.fluidProperty = this;
    this.state.orderID = this.metaData.orderID;
    this.state.calcedSizePercentEl = this.el.calcedSizePercentEl;
  }

  /** Performance optimization: If the width didn't change, we re-apply the last computed value, unless a higher order fluid property has been activated*/
  repeatLastComputedValue(): boolean {
    const { appliedState } = this.state;

    if (!appliedState) return false;

    const {
      value: appliedValue,
      orderID: appliedOrderID,
      fluidProperty: appliedFluidProperty,
      calcedSizePercentEl: appliedCalcedSizePercentEl,
      windowWidth: appliedWindowWidth,
    } = appliedState;

    if (isWidthSame(window.innerWidth, appliedWindowWidth)) {
      if (this === appliedFluidProperty) {
        // If the styles on which % calculation is based have changed, we want to re-compute the value
        if (this.el.inlineStylesChanged) return false;

        //If the applied value was calced from target size, we need to re-compute if the target has been resized
        if (appliedCalcedSizePercentEl?.isResized) return false;

        //Re-apply the last-applied value
        this.state.value = appliedValue;
        this.state.fluidProperty = this;
        return true;
      }
      if (this.metaData.orderID > appliedOrderID) return false; //If the order is higher than the last-applied, we still want to overwrite, even if the width is same
      return true; //If the order is lower, we cancel writing state, leaving it up to the last-applied to re-apply
    }

    return false; //If the width changed, we want to re-compute the value
  }

  getValueAsString(breakpoints: number[]): string {
    const computationParams = this.makeComputationParams(breakpoints);
    if (!computationParams) return "";

    const valueResult = computeValueForRange({
      ...computationParams,
      el: this.el,
      property: this.metaData.property,
    });

    if (Array.isArray(valueResult))
      return valueResult.map((value) => `${value}px`).join(" ");
    else return `${valueResult}px`;
  }

  makeComputationParams(breakpoints: number[]): ComputationParamsBase | null {
    for (let i = this.fluidBreakpoints.length - 1; i >= 0; i--) {
      const fluidRange = this.fluidBreakpoints[i];
      if (fluidRange && window.innerWidth >= fluidRange.minIndex) {
        const minBreakpoint = breakpoints[fluidRange.minIndex];
        const maxBreakpoint = breakpoints[fluidRange.maxIndex];
        const progress =
          (window.innerWidth - minBreakpoint) / (maxBreakpoint - minBreakpoint);
        return { progress, fluidRange, breakpoints };
      }
    }

    return null;
  }
}
