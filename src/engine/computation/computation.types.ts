import { ComputationParams } from "../engine.types";

export interface FluidValueComputationState
  extends Pick<ComputationParams, "el" | "property" | "breakpoints"> {}

export interface ICalcPercentTargetBlueprint {
  el: HTMLElement;
  checkResize: boolean;
  targetStyleProperties: string[];
}
