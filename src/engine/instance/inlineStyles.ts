import { InlineStyleController } from "../engine.types";
import { resetCachesForEl } from "./state";

export function setStyle(
  el: HTMLElement,
  styles: Record<string, string>
): InlineStyleController {
  applyInlineStyles(el, styles);

  if (!el.inlineStyleBatches) el.inlineStyleBatches = [];
  el.inlineStyleBatches.push(styles);

  return makeInlineStyleController(el, styles);
}

function applyInlineStyles(
  el: HTMLElement,
  styles: Record<string, string>
): void {
  for (const [property, value] of Object.entries(styles)) {
    el.style.setProperty(property, value);

    clearAppliedState(el, property);
  }
  resetCachesForEl(el);
  flagInlineStylesChanged(el);
}

function clearAppliedState(el: HTMLElement, property: string): void {
  if (el.statesByProperty?.[property])
    el.statesByProperty[property].appliedState = undefined;
}

function flagInlineStylesChanged(el: HTMLElement): void {
  el.inlineStylesChanged = true;
  for (const child of Array.from(el.children)) {
    if (child instanceof HTMLElement && child.isFluid)
      flagInlineStylesChanged(child);
  }
}

function makeInlineStyleController(
  el: HTMLElement,
  styles: Record<string, string>
): InlineStyleController {
  return {
    undo: () => {
      if (!el.inlineStyleBatches) return;

      el.inlineStyleBatches = el.inlineStyleBatches.filter(
        (batch) => batch !== styles
      );

      removeInlineStyles(el, styles);
      if (el.inlineStyleBatches.length > 0) {
        applyInlineStyles(
          el,
          el.inlineStyleBatches[el.inlineStyleBatches.length - 1]
        );
      }
    },
  };
}

function removeInlineStyles(
  el: HTMLElement,
  styles: Record<string, string>
): void {
  for (const [property] of Object.keys(styles)) {
    el.style.removeProperty(property);

    clearAppliedState(el, property);
  }
  resetCachesForEl(el);
}
