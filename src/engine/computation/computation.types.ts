import { IFluidRangeComputation } from "../../index.types";
import { ComputationParams } from "../engine.types";

export interface FluidValueComputationState
  extends Pick<ComputationParams, "el" | "property"> {}

export interface ICalcPercentTargetBlueprint {
  el: HTMLElement;
  checkResize: boolean;
  targetStyleProperties: string[];
}

export type ValueArrayParamsBase = Pick<
  IFluidRangeComputation,
  "valueIndexMap"
> &
  Readonly<{
    minValues: number | string | (number | string)[];
    maxValues: number | string | (number | string)[];
    locks?: number[] | undefined;
    minValueCalcTypes?: (string | undefined)[];
  }>;

export type ValueArrayParams = ValueArrayParamsBase &
  Readonly<{
    progress: number;
  }>;

export type MinMaxArrayCalcParams = Pick<
  ValueArrayParams,
  "locks" | "minValueCalcTypes" | "valueIndexMap" | "progress"
> & {
  minValuesArr: (number | string)[];
  maxValuesArr: (number | string)[];
  minValue: number | string;
  index: number;
};

export type CalcValueProgressParams = Readonly<{
  minValue: number | string;
  maxValue: number | string;
  calcType?: string;
}> &
  Pick<ValueArrayParams, "progress">;
