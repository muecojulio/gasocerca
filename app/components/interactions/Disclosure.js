"use client";

import { useId, useState } from "react";

export default function Disclosure({ title, children, defaultOpen = true, className = "" }) {
  const id = useId();
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`disclosure ${className}`}>
      <h3>
        <button type="button" id={`${id}-toggle`} className="ghost disclosure-toggle" aria-expanded={open} aria-controls={`${id}-content`} onClick={() => setOpen((current) => !current)}>
          <span>{title}</span>
          <span className="disclosure-chevron" data-open={open} aria-hidden="true">⌄</span>
        </button>
      </h3>
      <div id={`${id}-content`} className="disclosure-content" data-open={open} role="region" aria-labelledby={`${id}-toggle`} aria-hidden={!open} inert={!open ? true : undefined}>
        <div className="disclosure-inner">{children}</div>
      </div>
    </section>
  );
}
