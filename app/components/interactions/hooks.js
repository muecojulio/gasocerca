"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { centeredScrollLeft, gestureAxis, INTERACTIVE_SELECTOR, scrollEdges } from "../../../lib/interactions.mjs";

export function useMediaQuery(query) {
  const subscribe = useCallback((notify) => {
    const media = window.matchMedia(query);
    media.addEventListener("change", notify);
    return () => media.removeEventListener("change", notify);
  }, [query]);
  const snapshot = useCallback(() => window.matchMedia(query).matches, [query]);
  return useSyncExternalStore(subscribe, snapshot, () => false);
}

export function useReducedMotion() {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

// Touch listeners deliberately do not impose touch-action: pan-y on a parent.
// That would prevent horizontal map/rail gestures even when JS excludes them.
export function useHorizontalGesture(ref, options) {
  const callbacks = useRef(options);
  callbacks.current = options;
  const { enabled = true, exclude = INTERACTIVE_SELECTOR } = options;

  useEffect(() => {
    const node = ref.current;
    if (!node || !enabled) return;
    let gesture = null;
    let suppressClickUntil = 0;

    function cancel() {
      if (gesture) callbacks.current.onCancel?.();
      gesture = null;
    }

    function start(event) {
      cancel();
      // A new, intentional tap is not the synthetic click from the last drag.
      suppressClickUntil = 0;
      if (event.touches.length !== 1) return;
      const target = event.target instanceof Element ? event.target : event.target.parentElement;
      if (target?.closest(exclude)) return;
      const touch = event.touches[0];
      // Keep the browser's edge/back gestures and pinch-to-zoom available.
      if (touch.clientX < 20 || touch.clientX > window.innerWidth - 20) return;
      suppressClickUntil = 0;
      gesture = { id: touch.identifier, x: touch.clientX, y: touch.clientY, time: performance.now(), axis: null };
      callbacks.current.onStart?.();
    }

    function move(event) {
      if (!gesture) return;
      if (event.touches.length !== 1) return cancel();
      const touch = Array.from(event.touches).find((item) => item.identifier === gesture.id);
      if (!touch) return cancel();
      const dx = touch.clientX - gesture.x;
      const dy = touch.clientY - gesture.y;
      if (!gesture.axis) gesture.axis = gestureAxis(dx, dy);
      if (gesture.axis === "vertical") return cancel();
      if (gesture.axis !== "horizontal") return;
      if (!event.cancelable) return cancel();
      event.preventDefault();
      suppressClickUntil = performance.now() + 500;
      callbacks.current.onMove?.({ dx, dy, duration: performance.now() - gesture.time });
    }

    function end(event) {
      if (!gesture) return;
      const touch = Array.from(event.changedTouches).find((item) => item.identifier === gesture.id);
      if (touch && gesture.axis === "horizontal") {
        suppressClickUntil = performance.now() + 500;
        callbacks.current.onEnd?.({
          dx: touch.clientX - gesture.x,
          dy: touch.clientY - gesture.y,
          duration: performance.now() - gesture.time,
        });
      } else {
        callbacks.current.onCancel?.();
      }
      gesture = null;
    }

    function blockClick(event) {
      // Keyboard and assistive-technology clicks have detail === 0.
      if (event.detail !== 0 && performance.now() < suppressClickUntil) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }

    node.addEventListener("touchstart", start, { passive: true });
    node.addEventListener("touchmove", move, { passive: false });
    node.addEventListener("touchend", end, { passive: true });
    node.addEventListener("touchcancel", cancel, { passive: true });
    node.addEventListener("click", blockClick, true);
    return () => {
      node.removeEventListener("touchstart", start);
      node.removeEventListener("touchmove", move);
      node.removeEventListener("touchend", end);
      node.removeEventListener("touchcancel", cancel);
      node.removeEventListener("click", blockClick, true);
    };
  }, [ref, enabled, exclude]);
}

export function useHorizontalRail(ref, selectedKey) {
  const reducedMotion = useReducedMotion();
  const [edges, setEdges] = useState({ before: false, after: false });
  const pointer = useRef(null);
  const suppressClickUntil = useRef(0);

  const measure = useCallback(() => {
    const node = ref.current;
    if (!node) return;
    const next = scrollEdges(node);
    setEdges((old) => old.before === next.before && old.after === next.after ? old : next);
  }, [ref]);

  const centerSelection = useCallback(() => {
    const node = ref.current;
    if (!node || selectedKey == null) return;
    const item = Array.from(node.querySelectorAll("[data-rail-key]"))
      .find((element) => element.dataset.railKey === String(selectedKey));
    if (!item) return;
    const bounds = item.getBoundingClientRect();
    node.scrollTo({
      left: centeredScrollLeft({
        scrollLeft: node.scrollLeft, itemLeft: bounds.left,
        viewportLeft: node.getBoundingClientRect().left + node.clientLeft,
        itemWidth: bounds.width, clientWidth: node.clientWidth, scrollWidth: node.scrollWidth,
      }),
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }, [ref, selectedKey, reducedMotion]);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver(() => {
      measure();
      // Includes font/content resizing, not just viewport changes.
      centerSelection();
    });
    function observeChildren() {
      observer.disconnect();
      observer.observe(node);
      Array.from(node.children).forEach((child) => observer.observe(child));
      measure();
    }
    const mutations = new MutationObserver(observeChildren);
    mutations.observe(node, { childList: true });
    observeChildren();
    const frame = requestAnimationFrame(centerSelection);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      mutations.disconnect();
    };
  }, [ref, measure, centerSelection]);

  const endPointer = useCallback(() => {
    if (pointer.current?.moved) suppressClickUntil.current = performance.now() + 500;
    pointer.current = null;
  }, []);

  return {
    ...edges,
    scrollByPage(direction) {
      const node = ref.current;
      node?.scrollBy({ left: direction * node.clientWidth * 0.85, behavior: reducedMotion ? "auto" : "smooth" });
    },
    viewportProps: {
      ref,
      "data-horizontal-scroll": true,
      onScroll() {
        if (pointer.current && Math.abs(ref.current.scrollLeft - pointer.current.scrollLeft) > 6) {
          pointer.current.moved = true;
        }
        measure();
      },
      onPointerDownCapture(event) {
        suppressClickUntil.current = 0;
        pointer.current = { x: event.clientX, y: event.clientY, scrollLeft: ref.current.scrollLeft, moved: false };
      },
      onPointerMoveCapture(event) {
        if (pointer.current && Math.hypot(event.clientX - pointer.current.x, event.clientY - pointer.current.y) > 8) {
          pointer.current.moved = true;
        }
      },
      onPointerUpCapture: endPointer,
      onPointerCancelCapture: endPointer,
      onClickCapture(event) {
        if (event.detail !== 0 && performance.now() < suppressClickUntil.current) {
          event.preventDefault();
          event.stopPropagation();
        }
      },
    },
  };
}

export function useSelectionIndicator(ref, value) {
  const [position, setPosition] = useState({ left: 0, width: 0 });
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    function measure() {
      const selected = Array.from(node.querySelectorAll("[data-rail-key]"))
        .find((element) => element.dataset.railKey === value);
      if (!selected) return;
      // Layout coordinates ignore the brief press/hover transform.
      const next = { left: selected.offsetLeft, width: selected.offsetWidth };
      setPosition((old) => Math.abs(old.left - next.left) < 0.5 && Math.abs(old.width - next.width) < 0.5 ? old : next);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    node.querySelectorAll("[role=tab]").forEach((tab) => observer.observe(tab));
    measure();
    return () => observer.disconnect();
  }, [ref, value]);
  return position;
}
