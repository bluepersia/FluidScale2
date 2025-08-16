import { IComputationState } from "../engine.types";

export interface IComputeFluidValueState extends IComputationState {
  minOrMax: "min" | "max";
}
