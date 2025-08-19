import { addElements } from "./setup";
import {
  getState,
  pendingHiddenElements,
  setIntersectionObserverState,
  setMutationObserverState,
  visibleElements,
} from "./state";

function initMutationObserver(): void {
  if (getState().isMutationObserverInitialized) return;
  setMutationObserverState("mutationObserverInitializationToken");

  const observer = new MutationObserver((mutations) => {
    const addedNodes: HTMLElement[] = [];

    for (const mutation of mutations) {
      for (const addedNode of Array.from(mutation.addedNodes)) {
        if (addedNode instanceof HTMLElement) {
          addedNodes.push(addedNode);
        }
      }
    }

    addElements(addedNodes);
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

function handleIntersection(entries: IntersectionObserverEntry[]): void {
  for (const entry of entries) {
    if (entry.target instanceof HTMLElement) {
      if (entry.isIntersecting) {
        entry.target.isHidden = false;
        visibleElements.add(entry.target);
        pendingHiddenElements.delete(entry.target);
      } else {
        entry.target.isHidden = true;
        visibleElements.delete(entry.target);

        if (getState().isIntersectionObserverInitialized) {
          //Performance optimization:
          // 1) The initial batch of non-intersecting elements may be large (the whole document outside of viewport)
          // 2) We don't want to loop & flush all of them unnecessarily on initialization, where they are already at default styles
          // 3) We only add them if it's a batch of reasonable size that needs to be flushed back to default styles, after initialization (on exit viewport)
          pendingHiddenElements.add(entry.target);
        }
      }
    }
  }
  setIntersectionObserverState("intersectionObserverUpdateToken");
}

function handleResize(entries: ResizeObserverEntry[]): void {
  for (const entry of entries) {
    if (entry.target instanceof HTMLElement) {
      entry.target.isResized = true;
    }
  }
}

export { initMutationObserver, handleIntersection, handleResize };
