"use client";

import { useEffect, useId, useRef, useState } from "react";
import { revealOffset, shouldRevealActions } from "../../../lib/interactions.mjs";
import { useHorizontalGesture, useMediaQuery } from "./hooks";

export default function SwipeActions({ label, labelledBy, className = "", children, actions }) {
  const id = useId();
  const root = useRef(null);
  const actionPanel = useRef(null);
  const toggle = useRef(null);
  const desktop = useMediaQuery("(min-width: 800px)");
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState(0);
  const startOffset = useRef(0);
  const width = () => actionPanel.current?.offsetWidth || 144;
  const visible = desktop || open;

  useEffect(() => {
    setDragging(false);
    setOffset(open && !desktop ? width() : 0);
  }, [open, desktop]);

  useHorizontalGesture(root, {
    enabled: !desktop,
    onStart() { startOffset.current = open ? width() : 0; },
    onMove({ dx }) {
      setDragging(true);
      setOffset(revealOffset(startOffset.current, dx, width()));
    },
    onEnd({ dx, duration }) {
      const panelWidth = width();
      const next = shouldRevealActions({ offset: revealOffset(startOffset.current, dx, panelWidth), dx, duration, width: panelWidth });
      setDragging(false);
      setOpen(next);
      setOffset(next ? panelWidth : 0);
    },
    onCancel() {
      setDragging(false);
      setOffset(open ? width() : 0);
    },
  });

  function close() {
    setOpen(false);
    toggle.current?.focus({ preventScroll: true });
  }

  return (
    <article
      ref={root} className={`card swipe-card ${className}`} aria-labelledby={labelledBy}
      data-swipe-actions data-open={open} data-dragging={dragging}
      onKeyDown={(event) => {
        if (!desktop && open && event.key === "Escape") {
          event.preventDefault();
          close();
        }
      }}
    >
      <div className="card-surface" style={{ transform: desktop ? undefined : `translateX(${-offset}px)` }}>
        {children}
        <div className="swipe-card-footer">
          <span className="meta" aria-hidden="true">Desliza para ver opciones ↔</span>
          <button ref={toggle} type="button" className="ghost card-actions-toggle" aria-label={`${open ? "Cerrar" : "Mostrar"} opciones de viaje para ${label}`} aria-expanded={visible} aria-controls={`${id}-actions`} onClick={() => setOpen((current) => !current)}>
            {open ? "Cerrar opciones" : "Opciones de viaje"}
          </button>
        </div>
      </div>
      <div ref={actionPanel} id={`${id}-actions`} className="card-actions swipe-actions" role="group" aria-label={`Opciones de viaje para ${label}`} aria-hidden={!visible} inert={!visible ? true : undefined}>
        {actions}
        {!desktop && <button type="button" className="ghost swipe-close" aria-label={`Cerrar opciones de ${label}`} onClick={close}>Cerrar <span aria-hidden="true">×</span></button>}
      </div>
    </article>
  );
}
