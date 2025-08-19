import { IConfig } from "./engine/engine.types";
import { parseDocument } from "./parse/stylesheet";
import { config as globalConfig, setInitState } from "./engine/instance/state";
import { updateWithState } from "./engine/instance/update";
import { initMutationObserver } from "./engine/instance/observers";
import { addElements as addElementsToEngine } from "./engine/instance/setup";

/** Initialize the FluidScale engine. */
export default function init(config: Partial<IConfig>): void {
  Object.assign(globalConfig, config);
  const parsedDocument = parseDocument(document);
  if (parsedDocument) {
    setInitState(
      parsedDocument.fluidRangesByAnchor,
      parsedDocument.breakpoints,
      "engineInitializationToken"
    );
  }
  initMutationObserver();
  addElements([
    document.body,
    ...Array.from(document.body.querySelectorAll("*")).filter(
      (el): el is HTMLElement => el instanceof HTMLElement
    ),
  ]);
  requestAnimationFrame(updateWithState);
}

/** Add elements to activate automatic fluid interpolation on them. */
export function addElements(els: HTMLElement[]): void {
  return addElementsToEngine(els);
}
