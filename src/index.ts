import { IConfig, InlineStyleController } from "./engine/engine.types";
import { parseDocument } from "./parse/stylesheet";
import { config as globalConfig, setInitState } from "./engine/instance/state";
import { update } from "./engine/instance/update";
import { initMutationObserver } from "./engine/instance/observers";
import { addElements as addElementsToEngine } from "./engine/instance/setup";
import { setStyle as setStyleToEngine } from "./engine/instance/inlineStyles";

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
  const time = performance.now();
  addElements([
    document.body,
    ...Array.from(document.body.querySelectorAll("*")).filter(
      (el): el is HTMLElement => el instanceof HTMLElement
    ),
  ]);
  const took = performance.now() - time;
  document.body.innerHTML = `<h1>Parsed in ${took}ms</h1>`;
  requestAnimationFrame(update);
}

/** Add elements to activate automatic fluid interpolation on them. */
export function addElements(els: HTMLElement[]): void {
  return addElementsToEngine(els);
}

/** Set a single style on an element. */
export function setStyle(
  el: HTMLElement,
  property: string,
  value: string
): InlineStyleController {
  return setStyleToEngine(el, { [property]: value });
}

/** Set multiple styles on an element. */
export function setStyles(
  el: HTMLElement,
  styles: Record<string, string>
): InlineStyleController {
  return setStyleToEngine(el, styles);
}
