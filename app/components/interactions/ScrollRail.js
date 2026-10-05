"use client";

import { useRef } from "react";
import { useHorizontalRail } from "./hooks";

export default function ScrollRail({
  label, children, selectedKey, className = "", viewportClassName = "", viewportRef,
  role = "group", showLabel = true, controls = false, hint = false, indicator, onKeyDown,
}) {
  const localRef = useRef(null);
  const ref = viewportRef || localRef;
  const { before, after, viewportProps, scrollByPage } = useHorizontalRail(ref, selectedKey);

  return (
    <div className={`rail-shell ${className}`} data-overflow-before={before} data-overflow-after={after}>
      {(showLabel || controls) && (
        <div className="rail-heading">
          {showLabel && <p className="rail-label">{label}</p>}
          {controls && (
            <div className="rail-controls">
              <button type="button" className="ghost rail-arrow" aria-label={`${label}: tarjeta anterior`} disabled={!before} onClick={() => scrollByPage(-1)}>←</button>
              <button type="button" className="ghost rail-arrow" aria-label={`${label}: tarjeta siguiente`} disabled={!after} onClick={() => scrollByPage(1)}>→</button>
            </div>
          )}
        </div>
      )}
      <div className="rail-window">
        <div {...viewportProps} className={`horizontal-rail ${viewportClassName}`} role={role} aria-label={label} tabIndex={role === "region" && (before || after) ? 0 : undefined} aria-orientation={role === "tablist" ? "horizontal" : undefined} onKeyDown={onKeyDown}>
          {indicator}
          {children}
        </div>
        <span className="rail-fade rail-fade-before" aria-hidden="true" />
        <span className="rail-fade rail-fade-after" aria-hidden="true" />
      </div>
      {hint && (before || after) && <p className="scroll-hint" aria-hidden="true">Desliza para ver más opciones <span>↔</span></p>}
    </div>
  );
}
