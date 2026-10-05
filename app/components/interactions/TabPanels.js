"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { clamp, isHorizontalSwipe, SECTION_SWIPE_EXCLUSIONS } from "../../../lib/interactions.mjs";
import { panelId, tabId } from "./SectionTabs";
import { useHorizontalGesture, useReducedMotion } from "./hooks";

export default function TabPanels({ items, value, onChange, panels }) {
  const root = useRef(null);
  const previous = useRef(value);
  const reducedMotion = useReducedMotion();
  const [transition, setTransition] = useState(null);
  const [announcement, setAnnouncement] = useState("");

  useLayoutEffect(() => {
    const from = previous.current;
    previous.current = value;
    if (from === value) {
      if (reducedMotion) setTransition(null);
      return;
    }
    const oldPanel = document.getElementById(panelId(from));
    if (oldPanel?.contains(document.activeElement)) {
      document.getElementById(panelId(value))?.focus({ preventScroll: true });
    }
    if (root.current?.getBoundingClientRect().top < -24) {
      root.current.scrollIntoView({ block: "start", behavior: reducedMotion ? "instant" : "smooth" });
    }
    if (reducedMotion) {
      setTransition(null);
      return;
    }
    const direction = items.findIndex((item) => item.id === value) > items.findIndex((item) => item.id === from) ? 1 : -1;
    setTransition({ from, to: value, direction });
    const timer = setTimeout(() => setTransition(null), 220);
    return () => clearTimeout(timer);
  }, [value, reducedMotion, items]);

  useHorizontalGesture(root, {
    exclude: SECTION_SWIPE_EXCLUSIONS,
    onEnd(gesture) {
      if (!isHorizontalSwipe(gesture)) return;
      const index = items.findIndex((item) => item.id === value);
      const next = clamp(index + (gesture.dx < 0 ? 1 : -1), 0, items.length - 1);
      if (next === index) return;
      onChange(items[next].id);
      setAnnouncement(`Sección ${items[next].label}.`);
    },
  });

  return (
    <div ref={root} className="panels">
      <p className="section-swipe-hint">← Desliza aquí o usa las pestañas para cambiar de sección →</p>
      <span className="sr-only" role="status" aria-live="polite">{announcement}</span>
      <div className="panel-deck" style={{ "--panel-direction": transition?.direction || 1 }}>
        {items.map((item) => {
          const active = item.id === value;
          const leaving = item.id === transition?.from;
          return (
            <section
              key={item.id} id={panelId(item.id)} role="tabpanel" aria-labelledby={tabId(item.id)}
              tabIndex={active ? 0 : -1} hidden={!active && !leaving} aria-hidden={!active}
              inert={!active ? true : undefined}
              className={`panel ${active ? "active" : ""} ${leaving ? "panel-leaving" : ""} ${active && transition?.to === item.id ? "panel-entering" : ""}`}
            >
              {panels[item.id]}
            </section>
          );
        })}
      </div>
    </div>
  );
}
