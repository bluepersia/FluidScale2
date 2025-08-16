import { IFluidRange } from "../index.types";
import { FluidRangeMetaData } from "../index.types";
import { breakpoints } from "../index";
import {
  IFluidProperty,
  FluidPropertyState,
  FluidPropertyConfig,
  IComputationState,
  IComputationStateBase,
} from "./engine.types";
import { computeValueForRange } from "./computation/computation";

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

    if (!this.el.statesByProperty) this.el.statesByProperty = {};

    if (!this.el.statesByProperty[this.metaData.property]) {
      this.el.statesByProperty[this.metaData.property] = {
        property: this.metaData.property,
        value: "",
        appliedValue: "",
        appliedWidth: -1,
        order: -1,
        fluidProperty: null,
      };
    }

    this.state = this.el.statesByProperty[this.metaData.property];
  }

  update(): void {
    if (this.el.isHidden) return;

    if (this.metaData.order < this.state.order) return;

    const value = this.getValueAsString();

    if (!value) return;

    this.state.value = value;
    this.state.fluidProperty = this;
  }

  getValueAsString(): string {
    const valueResult = this.computeValueForWidth(window.innerWidth, undefined);
    if (valueResult === null) return "";

    if (Array.isArray(valueResult))
      return valueResult.map((value) => `${value}px`).join(" ");
    else return `${valueResult}px`;
  }

  computeValueForWidth(
    width: number,
    mergeMinMaxState: Partial<IComputationState> | undefined
  ): number | number[] | null {
    const state = this.getComputationState(width);
    if (!state) return null;

    if (mergeMinMaxState) {
      if (mergeMinMaxState.minBreakpoint !== undefined)
        state.minBreakpoint = mergeMinMaxState.minBreakpoint;
      if (mergeMinMaxState.maxBreakpoint !== undefined)
        state.maxBreakpoint = mergeMinMaxState.maxBreakpoint;
    }

    return computeValueForRange({
      ...state,
      el: this.el,
      property: this.metaData.property,
    });
  }

  getComputationState(width: number): IComputationStateBase | null {
    for (let i = this.fluidBreakpoints.length - 1; i >= 0; i--) {
      const fluidRange = this.fluidBreakpoints[i];
      if (fluidRange && width >= fluidRange.breakpointIndex) {
        const minBreakpoint = breakpoints[fluidRange.breakpointIndex];
        const maxBreakpoint = breakpoints[fluidRange.nextBreakpointIndex];
        const progress =
          (window.innerWidth - minBreakpoint) / (maxBreakpoint - minBreakpoint);
        return { minBreakpoint, maxBreakpoint, progress, fluidRange };
      }
    }

    return null;
  }
}
