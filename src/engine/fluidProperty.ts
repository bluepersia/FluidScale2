import { IFluidRange } from "../index.types";
import { FluidRangeMetaData } from "../index.types";
import {
  IFluidProperty,
  FluidPropertyState,
  FluidPropertyConfig,
  ComputationParamsBase,
} from "./engine.types";
import { computeValueForRange } from "./computation/interpolator";
import { isWidthSame } from "../utils";
import { getState } from "./instance/state";

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
    if (!this.el.states) this.el.states = [];

    let state = this.el.statesByProperty[this.metaData.property];
    if (!state) {
      this.el.statesByProperty[this.metaData.property] = state = {
        property: this.metaData.property,
        value: "",
        orderID: -1,
        fluidProperty: null,
      };
      this.el.states.push(state);
    }

    return this.el.statesByProperty[this.metaData.property];
  }

  update(): void {
    if (this.metaData.orderID < this.state.orderID) return; //Apply only the highest order fluid property

    //If this is a dynamic selector, we only want to apply it if it's actually active on the element
    if (
      this.metaData.dynamicSelector &&
      !this.el.matches(this.metaData.dynamicSelector)
    )
      return;

    if (this.repeatLastComputedValue()) return;

    this.el.calcedSizePercentEl = undefined;
    const value = this.computeValueAsString();

    this.state.value = value;
    this.state.fluidProperty = this;
    this.state.orderID = this.metaData.orderID;
    this.state.calcedSizePercentEl = this.el.calcedSizePercentEl;
  }

  /** Performance optimization: If the width didn't change, we re-apply the last computed value, unless a higher order fluid property has been activated*/
  repeatLastComputedValue(): boolean {
    const { appliedState } = this.state;

    if (!appliedState) return false;

    if (isWidthSame(window.innerWidth, this.el.updateWidth ?? 0)) {
      const {
        value: appliedValue,
        orderID: appliedOrderID,
        fluidProperty: appliedFluidProperty,
        calcedSizePercentEl: appliedCalcedSizePercentEl,
      } = appliedState;

      if (this === appliedFluidProperty) {
        return this.reApplyState(appliedValue, appliedCalcedSizePercentEl);
      }
      if (this.metaData.orderID > appliedOrderID) return false; //If the order is higher than the last-applied, we still want to overwrite, even if the width is same
      return true; //If the order is lower, we cancel writing state, leaving it up to the last-applied to re-apply
    }

    return false; //If the width changed, we want to re-compute the value
  }

  reApplyState(
    appliedValue: string,
    appliedCalcedSizePercentEl: HTMLElement | undefined
  ): boolean {
    // If the styles on which % calculation is based have changed, we want to re-compute the value
    if (this.el.inlineStylesChanged) return false;

    //If the applied value was calced from target size, we need to re-compute if the target has been resized
    if (appliedCalcedSizePercentEl?.isResized) return false;

    //Re-apply the last-applied value
    this.state.value = appliedValue;
    this.state.fluidProperty = this;
    return true;
  }

  computeValueAsString(): string {
    const computationParams = this.makeComputationParams();
    if (!computationParams) return "";

    const valueResult = computeValueForRange({
      ...computationParams,
      el: this.el,
      property: this.metaData.property,
    });

    if (Array.isArray(valueResult))
      return valueResult
        .map((value) => (typeof value === "string" ? value : `${value}px`))
        .join(" ");
    else
      return typeof valueResult === "string" ? valueResult : `${valueResult}px`;
  }

  makeComputationParams(): ComputationParamsBase | null {
    const { breakpoints } = getState();
    for (let i = this.fluidBreakpoints.length - 1; i >= 0; i--) {
      const fluidRange = this.fluidBreakpoints[i];
      const minBreakpoint = fluidRange ? breakpoints[fluidRange.minIndex] : 0;
      if (fluidRange && window.innerWidth >= minBreakpoint) {
        const maxBreakpoint = breakpoints[fluidRange.maxIndex];
        const progress =
          (window.innerWidth - minBreakpoint) / (maxBreakpoint - minBreakpoint);
        return { progress, fluidRange };
      }
    }

    return null;
  }
}
