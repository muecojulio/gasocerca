"use client";

import { useEffect, useState } from "react";

export default function FeedbackButton({
  status = "idle", children, loadingLabel = "Procesando…", successLabel = "Listo",
  errorLabel = "Reintentar", disabled = false, className = "ghost", ...props
}) {
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    setSettled(false);
    if (status !== "success") return;
    const timer = setTimeout(() => setSettled(true), 2600);
    return () => clearTimeout(timer);
  }, [status]);

  const visualStatus = status === "success" && settled ? "idle" : status;
  const busy = status === "loading";
  const text = visualStatus === "loading" ? loadingLabel
    : visualStatus === "success" ? successLabel
    : visualStatus === "error" ? errorLabel : children;

  return (
    <button
      {...props}
      type={props.type || "button"}
      className={className}
      data-state={visualStatus}
      aria-busy={busy || undefined}
      disabled={disabled || busy}
    >
      {visualStatus !== "idle" && (
        <span className={`feedback-icon ${visualStatus === "loading" ? "spinner" : ""}`} aria-hidden="true">
          {visualStatus === "success" ? "✓" : visualStatus === "error" ? "!" : ""}
        </span>
      )}
      <span>{text}</span>
    </button>
  );
}

export function FeedbackMessage({ tone = "status", children }) {
  const hasMessage = Boolean(children);
  return (
    <div className={hasMessage ? `${tone === "error" ? "error" : "notice"} feedback-message` : "sr-only"} role={tone === "error" ? "alert" : "status"} aria-live={tone === "error" ? undefined : "polite"} aria-atomic="true">
      {hasMessage && <span className="feedback-icon" aria-hidden="true">{tone === "error" ? "!" : tone === "success" ? "✓" : "i"}</span>}
      <span>{children}</span>
    </div>
  );
}
