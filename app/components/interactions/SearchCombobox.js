"use client";

import { useEffect, useRef, useState } from "react";
import { filterOptions, normalizeSearch } from "../../../lib/interactions.mjs";

const EMPTY_OPTIONS = [];
function optionKey(option) {
  return String(option.id ?? option.value ?? (option.lat != null && option.lng != null ? `${option.lat},${option.lng}` : option.label));
}

export default function SearchCombobox({
  id, label, value, onChange, onSelect, selectedOption, placeholder,
  loadOptions, options = EMPTY_OPTIONS, minLength = 3,
}) {
  const root = useRef(null);
  const input = useRef(null);
  const list = useRef(null);
  const cache = useRef(new Map());
  const selectedKey = selectedOption ? optionKey(selectedOption) : "";
  const selected = useRef(selectedKey);
  selected.current = selectedKey;
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [active, setActive] = useState(-1);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [retry, setRetry] = useState(0);
  const query = normalizeSearch(value);
  const listId = `${id}-options`;

  useEffect(() => {
    function closeOutside(event) {
      if (!root.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("focusin", closeOutside);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("focusin", closeOutside);
    };
  }, []);

  useEffect(() => {
    setError("");
    if (!open || query.length < minLength) {
      setStatus("idle");
      if (query.length < minLength) setItems([]);
      setActive(-1);
      return;
    }
    function show(results) {
      setItems(results);
      const index = results.findIndex((item) => optionKey(item) === selected.current);
      setActive(index >= 0 ? index : results.length ? 0 : -1);
      setStatus("success");
    }
    if (!loadOptions) {
      show(filterOptions(options, query));
      return;
    }
    if (cache.current.has(query)) {
      show(cache.current.get(query));
      return;
    }
    const controller = new AbortController();
    setItems([]);
    setActive(-1);
    setStatus("loading");
    const timer = setTimeout(async () => {
      try {
        // Remote providers keep their relevance ranking (e.g. CDMX aliases).
        // Normalization is also applied by the provider and the cache key.
        const results = await loadOptions(query, { signal: controller.signal });
        if (controller.signal.aborted) return;
        cache.current.set(query, results);
        if (cache.current.size > 50) cache.current.delete(cache.current.keys().next().value);
        show(results);
      } catch (err) {
        if (controller.signal.aborted) return;
        setItems([]);
        setActive(-1);
        setStatus("error");
        setError(err.message || "No se pudo buscar. Revisa tu conexión e intenta de nuevo.");
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, query, minLength, loadOptions, options, retry]);

  useEffect(() => {
    const viewport = list.current;
    const option = viewport?.querySelector(`[data-option-index="${active}"]`);
    if (!open || !viewport || !option) return;
    // Scroll only the listbox, not the surrounding page or virtual keyboard.
    const top = option.getBoundingClientRect().top - viewport.getBoundingClientRect().top + viewport.scrollTop;
    const bottom = top + option.offsetHeight;
    if (top < viewport.scrollTop) viewport.scrollTop = top;
    else if (bottom > viewport.scrollTop + viewport.clientHeight) viewport.scrollTop = bottom - viewport.clientHeight;
  }, [open, active, items]);

  function choose(item) {
    onSelect(item);
    setAnnouncement(`${label}: ${item.label}, seleccionado.`);
    input.current?.focus({ preventScroll: true });
    setOpen(false);
    setActive(-1);
  }

  function onKeyDown(event) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      if (items.length) {
        const next = event.key === "ArrowDown"
          ? active < 0 ? 0 : Math.min(active + 1, items.length - 1)
          : active < 0 ? items.length - 1 : Math.max(active - 1, 0);
        setActive(next);
      }
    } else if (open && items.length && (event.key === "Home" || event.key === "End")) {
      event.preventDefault();
      setActive(event.key === "Home" ? 0 : items.length - 1);
    } else if (event.key === "Enter" && open && active >= 0 && items[active]) {
      event.preventDefault();
      choose(items[active]);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      setActive(-1);
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  }

  const help = `Escribe al menos ${minLength} caracteres y elige un lugar.`;
  const message = query.length < minLength ? help
    : status === "loading" ? "Buscando lugares…"
    : status === "error" ? error
    : status === "success" && !items.length ? "Sin coincidencias. Prueba con otra ciudad o colonia."
    : "";
  const liveMessage = open
    ? message || `${items.length} ${items.length === 1 ? "opción disponible" : "opciones disponibles"}. Usa las flechas y Enter para elegir.`
    : announcement;

  return (
    <div className="combobox" ref={root} data-no-swipe>
      <label id={`${id}-label`} htmlFor={id}>{label}</label>
      <div className="combobox-field">
        <input
          ref={input} id={id} type="text" role="combobox" value={value}
          autoComplete="off" autoCapitalize="none" spellCheck={false}
          placeholder={placeholder} aria-autocomplete="list" aria-haspopup="listbox"
          aria-expanded={open} aria-controls={listId}
          aria-activedescendant={open && active >= 0 && items[active] ? `${id}-option-${active}` : undefined}
          aria-describedby={`${id}-help${open && status === "error" ? ` ${id}-error` : ""}`}
          aria-invalid={open && status === "error" ? true : undefined}
          aria-busy={status === "loading" || undefined}
          onFocus={() => setOpen(true)} onKeyDown={onKeyDown}
          onChange={(event) => {
            onChange(event.target.value);
            setAnnouncement("");
            setOpen(true);
            setActive(-1);
          }}
        />
        <button
          type="button" className="combobox-toggle ghost" tabIndex={-1}
          aria-label={`${open ? "Cerrar" : "Mostrar"} opciones de ${label.toLowerCase()}`}
          aria-expanded={open} aria-controls={listId}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            const next = !open;
            input.current?.focus({ preventScroll: true });
            setOpen(next);
          }}
        >
          <span className={status === "loading" ? "spinner feedback-icon" : "combobox-chevron"} data-open={open} aria-hidden="true">{status === "loading" ? "" : "⌄"}</span>
        </button>
      </div>
      <p id={`${id}-help`} className="field-help">{help}</p>
      <div className="combobox-popup" hidden={!open}>
        <ul ref={list} id={listId} role="listbox" aria-labelledby={`${id}-label`} aria-busy={status === "loading" || undefined}>
          {items.map((item, index) => (
            <li
              key={`${optionKey(item)}-${index}`} id={`${id}-option-${index}`} role="option"
              aria-selected={optionKey(item) === selectedKey} data-active={index === active}
              data-option-index={index} className="suggestion"
              onMouseDown={(event) => event.preventDefault()}
              onPointerMove={(event) => { if (event.pointerType === "mouse") setActive(index); }}
              onClick={() => choose(item)}
            >
              <span>{item.label}</span>
              {optionKey(item) === selectedKey && <span className="selection-mark" aria-hidden="true">✓</span>}
            </li>
          ))}
        </ul>
        {message && <p className="combobox-message" id={status === "error" ? `${id}-error` : undefined}>{status === "error" && <span aria-hidden="true">! </span>}{message}</p>}
        {status === "error" && <button type="button" className="ghost combobox-retry" onClick={() => { input.current?.focus({ preventScroll: true }); setRetry((count) => count + 1); }}>Reintentar búsqueda</button>}
      </div>
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">{liveMessage}</span>
    </div>
  );
}
