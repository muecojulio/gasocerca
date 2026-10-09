"use client";

import { useEffect, useId, useRef, useState } from "react";
import { money } from "../../lib/gasocerca";
import FeedbackButton from "./interactions/FeedbackButton";
import { useReducedMotion } from "./interactions/hooks";

let leafletPromise;
function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (!leafletPromise) {
    leafletPromise = import("leaflet")
      .then((module) => {
        const L = module.default || module;
        window.L = L;
        return L;
      })
      .catch(() => {
        leafletPromise = null;
        throw new Error("No se pudo cargar el mapa. Las listas de estaciones siguen disponibles.");
      });
  }
  return leafletPromise;
}

function textPopup(text) {
  const popup = document.createElement("div");
  popup.textContent = text;
  return popup;
}

function stationPopup(station, tipo, best) {
  // CNE names are text, not HTML.
  const popup = document.createElement("div");
  const title = document.createElement("strong");
  title.textContent = `${best ? "Más barata · " : ""}${station.name}`;
  const price = document.createElement("p");
  price.textContent = `${money(station[tipo])} / L`;
  popup.append(title, price);
  return popup;
}

export default function StationMap({ active, coords, data, tipo, destino, ruta }) {
  const container = useRef(null);
  const retryControl = useRef(null);
  const focusAfterRetry = useRef(false);
  const helpId = useId();
  const reducedMotion = useReducedMotion();
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!active) focusAfterRetry.current = false;
    if (!active || !focusAfterRetry.current || (status !== "success" && status !== "error")) return;
    // Restore task focus after the retry button disappears, without stealing
    // it if the user has already moved to another control.
    if (document.activeElement === document.body) {
      (status === "success" ? container.current : retryControl.current)?.focus({ preventScroll: true });
    }
    focusAfterRetry.current = false;
  }, [status, active]);

  useEffect(() => {
    if (!active || !coords) return;
    let map;
    let observer;
    let cancelled = false;
    setStatus("loading");
    setError("");
    async function draw() {
      try {
        const L = await loadLeaflet();
        if (cancelled || !container.current) return;
        map = L.map(container.current, {
          zoomControl: false,
          scrollWheelZoom: false,
          zoomAnimation: !reducedMotion,
          fadeAnimation: !reducedMotion,
          markerZoomAnimation: !reducedMotion,
        }).setView([coords.lat, coords.lng], 13);
        L.control.zoom({ zoomInTitle: "Acercar mapa", zoomOutTitle: "Alejar mapa" }).addTo(map);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap" }).addTo(map);
        L.marker([coords.lat, coords.lng], { title: "Origen", alt: "Origen de la búsqueda" }).addTo(map).bindPopup("Origen");
        if (destino) L.marker([destino.lat, destino.lng], { title: "Destino", alt: "Destino de la ruta" }).addTo(map).bindPopup(textPopup(destino.label || "Destino"));
        const onRoute = Boolean(ruta?.geometry?.length);
        if (onRoute) {
          const line = L.polyline(ruta.geometry.map(([lng, lat]) => [lat, lng]), { color: "#6cb6ff", weight: 5, opacity: 0.9 }).addTo(map);
          map.fitBounds(line.getBounds(), { padding: [28, 28], animate: !reducedMotion });
        }
        (onRoute ? ruta.estaciones || [] : data?.cercanas || []).forEach((station) => {
          const best = station.id === (onRoute ? ruta.mejor?.id : data?.mejor?.id);
          L.circleMarker([station.lat, station.lng], {
            radius: best ? 10 : 7, color: best ? "#3dd68c" : "#f5b942", fillOpacity: 0.9,
          }).addTo(map).bindPopup(stationPopup(station, tipo, best));
        });
        observer = new ResizeObserver(() => map?.invalidateSize({ pan: false, animate: false }));
        observer.observe(container.current);
        map.invalidateSize({ pan: false, animate: false });
        setStatus("success");
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setError(err.message || "No se pudo mostrar el mapa. Consulta las listas de estaciones.");
        }
      }
    }
    draw();
    return () => {
      cancelled = true;
      observer?.disconnect();
      map?.remove();
    };
  }, [active, coords, data, tipo, destino, ruta, reducedMotion, retry]);

  if (!coords) return <div className="empty">Elige un origen para ver las estaciones en el mapa.</div>;
  return (
    <div className="map-frame" data-no-swipe>
      <p id={helpId} className="field-help">Arrastra el mapa o usa sus controles para acercar y alejar. También puedes consultar las estaciones en las listas.</p>
      {status === "loading" && <p className="notice" role="status">Cargando mapa…</p>}
      {error && <div className="error" role="alert"><p>! {error}</p><FeedbackButton ref={retryControl} status={status} onClick={() => { focusAfterRetry.current = true; setRetry((count) => count + 1); }} loadingLabel="Cargando mapa…" errorLabel="Reintentar mapa">Reintentar mapa</FeedbackButton></div>}
      <div id="map" ref={container} role="region" aria-label="Mapa de gasolineras" aria-describedby={helpId} aria-busy={status === "loading" || undefined} tabIndex={0} />
    </div>
  );
}
