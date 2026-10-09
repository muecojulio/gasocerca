"use client";

import { useEffect, useRef } from "react";
import { tabIndexForKey } from "../../../lib/interactions.mjs";
import ScrollRail from "./ScrollRail";
import { useSelectionIndicator } from "./hooks";

export const tabId = (id) => `section-tab-${id}`;
export const panelId = (id) => `section-panel-${id}`;

export default function SectionTabs({ items, value, onChange }) {
  const ref = useRef(null);
  const indicator = useSelectionIndicator(ref, value);

  useEffect(() => {
    if (ref.current?.contains(document.activeElement)) {
      document.getElementById(tabId(value))?.focus({ preventScroll: true });
    }
  }, [value]);

  function onKeyDown(event) {
    const tab = event.target.closest('[role="tab"]');
    if (!tab) return;
    const current = items.findIndex((item) => item.id === tab.dataset.railKey);
    const next = tabIndexForKey(event.key, current, items.length);
    if (next < 0) return;
    event.preventDefault();
    onChange(items[next].id);
    document.getElementById(tabId(items[next].id))?.focus({ preventScroll: true });
  }

  return (
    <nav className="section-tabs" aria-label="Secciones de GasoCerca">
      <ScrollRail
        label="Secciones de GasoCerca" role="tablist" showLabel={false} hint
        viewportRef={ref} viewportClassName="tabs-rail" selectedKey={value} onKeyDown={onKeyDown}
        indicator={<span className="tab-indicator" aria-hidden="true" style={{ width: indicator.width, transform: `translateX(${indicator.left}px)`, opacity: indicator.width ? 1 : 0 }} />}
      >
        {items.map((item) => (
          <button
            type="button" key={item.id} id={tabId(item.id)} role="tab"
            className={`tab ${value === item.id ? "active" : ""}`} data-rail-key={item.id}
            aria-label={item.label} aria-selected={value === item.id} aria-controls={panelId(item.id)}
            tabIndex={value === item.id ? 0 : -1} onClick={() => onChange(item.id)}
          >
            <span className="tab-label-full">{item.label}</span>
            <span className="tab-label-short" aria-hidden="true">{item.shortLabel || item.label}</span>
          </button>
        ))}
      </ScrollRail>
    </nav>
  );
}
