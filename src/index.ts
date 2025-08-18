import { IConfig } from "./engine/engine.types";
import { parseDocument } from "./parse/stylesheet";
import { config as globalConfig, setInitState } from "./engine/instance/state";
import { update } from "./engine/instance/update";
import { initMutationObserver } from "./engine/instance/observers";
import { addElements } from "./engine/instance/setup";

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
      (el) => el instanceof HTMLElement
    ),
  ]);
  requestAnimationFrame(update);
}
