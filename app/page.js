"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const FUELS = [
  { id: "regular", label: "Regular" },
  { id: "premium", label: "Premium" },
  { id: "diesel", label: "Diésel" },
];
const RADIOS = [3, 5, 8, 15, 25];

function money(n) {
  if (n == null) return "—";
  return `$${Number(n).toFixed(2)}`;
}
function mapsUrl(station) {
  return `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`;
}
function wazeUrl(station) {
  return `https://waze.com/ul?ll=${station.lat},${station.lng}&navigate=yes`;
}
function routeMapsUrl(origin, dest, via) {
  const params = new URLSearchParams({
    api: "1",
    origin: `${origin.lat},${origin.lng}`,
    destination: `${dest.lat},${dest.lng}`,
    travelmode: "driving",
  });
  if (via) params.set("waypoints", `${via.lat},${via.lng}`);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export default function HomePage() {
  const [tab, setTab] = useState("cercanas");
  const [tipo, setTipo] = useState("regular");
  const [radio, setRadio] = useState(8);
  const [coords, setCoords] = useState(null);
  const [lugar, setLugar] = useState("");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [destQuery, setDestQuery] = useState("");
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [destino, setDestino] = useState(null);
  const [ruta, setRuta] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rutaLoading, setRutaLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadStations(nextCoords, nextTipo = tipo, nextRadio = radio) {
    if (!nextCoords) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/estaciones?lat=${nextCoords.lat}&lng=${nextCoords.lng}&radio=${nextRadio}&tipo=${nextTipo}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudieron cargar las estaciones.");
      setData(json);
    } catch (err) {
      setData(null);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadRuta(origin, dest, nextTipo = tipo) {
    if (!origin || !dest) return;
    setRutaLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/ruta?fromLat=${origin.lat}&fromLng=${origin.lng}&toLat=${dest.lat}&toLng=${dest.lng}&tipo=${nextTipo}&radio=3`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo calcular la ruta.");
      setRuta(json);
      setTab("ruta");
    } catch (err) {
      setRuta(null);
      setError(err.message);
    } finally {
      setRutaLoading(false);
    }
  }

  function useGps() {
    if (!navigator.geolocation) {
      setError("Este dispositivo no permite geolocalización. Busca una ciudad.");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(next);
        setLugar("Tu ubicación actual");
        loadStations(next);
        if (destino) loadRuta(next, destino);
      },
      () => {
        setLoading(false);
        setError("No se pudo leer el GPS. Acepta el permiso de ubicación o busca una ciudad.");
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }

  async function searchCity(text, setter) {
    if (!text || text.length < 3) {
      setter([]);
      return;
    }
    const res = await fetch(`/api/buscar?q=${encodeURIComponent(text)}`);
    const json = await res.json();
    setter(json.results || []);
  }

  function pickPlace(place) {
    const next = { lat: place.lat, lng: place.lng };
    setCoords(next);
    setLugar(place.label);
    setQuery(place.label.split(",")[0]);
    setSuggestions([]);
    loadStations(next);
    if (destino) loadRuta(next, destino);
  }

  function pickDestino(place) {
    const next = { lat: place.lat, lng: place.lng, label: place.label };
    setDestino(next);
    setDestQuery(place.label.split(",")[0]);
    setDestSuggestions([]);
    if (coords) loadRuta(coords, next);
    else setError("Primero elige tu origen (GPS o ciudad). La ruta no se pierde.");
  }

  useEffect(() => {
    if (coords) loadStations(coords, tipo, radio);
    if (coords && destino) loadRuta(coords, destino, tipo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, radio]);

  useEffect(() => {
    if (!coords || (tab !== "mapa" && tab !== "ruta")) return;
    let map;
    let cancelled = false;
    async function draw() {
      if (!window.L) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
      }
      if (cancelled || !window.L || !coords) return;
      const el = document.getElementById("map");
      if (!el) return;
      if (el._leaflet_id) el._leaflet_id = null;
      el.innerHTML = "";
      map = window.L.map(el).setView([coords.lat, coords.lng], 13);
      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap" }).addTo(map);
      setTimeout(() => map.invalidateSize(), 250);
      window.L.marker([coords.lat, coords.lng]).addTo(map).bindPopup("Origen");
      if (destino) window.L.marker([destino.lat, destino.lng]).addTo(map).bindPopup(destino.label || "Destino");
      if (ruta?.geometry?.length) {
        const latlngs = ruta.geometry.map(([lng, lat]) => [lat, lng]);
        const line = window.L.polyline(latlngs, { color: "#6cb6ff", weight: 5, opacity: 0.9 }).addTo(map);
        map.fitBounds(line.getBounds(), { padding: [28, 28] });
        (ruta.estaciones || []).forEach((station) => {
          const isBest = ruta.mejor && station.id === ruta.mejor.id;
          window.L.circleMarker([station.lat, station.lng], {
            radius: isBest ? 10 : 7,
            color: isBest ? "#3dd68c" : "#f5b942",
            fillOpacity: 0.9,
          }).addTo(map).bindPopup(`<b>${isBest ? "Más barata en ruta · " : ""}${station.name}</b><br/>${money(station[tipo])} / L`);
        });
        return;
      }
      (data?.cercanas || []).forEach((station) => {
        window.L.circleMarker([station.lat, station.lng], {
          radius: 8,
          color: data.mejor && station.id === data.mejor.id ? "#3dd68c" : "#f5b942",
          fillOpacity: 0.9,
        }).addTo(map).bindPopup(`<b>${station.name}</b><br/>${money(station[tipo])} / L`);
      });
    }
    draw();
    return () => {
      cancelled = true;
      if (map) map.remove();
    };
  }, [data, tab, coords, tipo, destino, ruta]);

  const list = useMemo(() => {
    const source = tab === "baratas" ? data?.baratas : data?.cercanas;
    if (!source) return [];
    if (tab === "baratas") {
      return [...source].sort((a, b) => {
        const pa = a[tipo];
        const pb = b[tipo];
        if (pa == null) return 1;
        if (pb == null) return -1;
        return pa - pb || a.distance - b.distance;
      });
    }
    return source;
  }, [tab, data, tipo]);

  const ahorro = useMemo(() => {
    if (!data?.mejor || !data?.promedioZona || data.mejor[tipo] == null) return null;
    const porLitro = data.promedioZona - data.mejor[tipo];
    return { porLitro, tanque40: porLitro * 40 };
  }, [data, tipo]);

  function StationCard({ station, extra }) {
    return (
      <article className="card">
        <div className="card-top">
          <h3>{station.name}</h3>
          <div>
            {data?.masCercana?.id === station.id && <span className="badge gold">Más cerca</span>}{" "}
            {data?.mejor?.id === station.id && <span className="badge green">Más barata</span>}
            {extra}
          </div>
        </div>
        <p className="meta">{station.distance != null ? `${station.distance} km` : `Desvío ${station.desvioKm} km`} · permiso {station.cre || "CNE"}</p>
        <div className="prices">
          {FUELS.map((f) => (
            <div key={f.id} className={`price-pill ${tipo === f.id ? "selected" : ""}`}>
              <small>{f.label}</small>
              <b>{money(station[f.id])}</b>
            </div>
          ))}
        </div>
        <div className="card-actions">
          <a href={mapsUrl(station)} target="_blank" rel="noreferrer">Cómo llegar</a>
          <a href={wazeUrl(station)} target="_blank" rel="noreferrer">Waze</a>
        </div>
      </article>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <img src="/icon-192.png" alt="GasoCerca" />
          <div>
            <h1>GasoCerca</h1>
            <p>Precios oficiales en México</p>
          </div>
        </div>
        <div className="top-links">
          <Link className="ghost" href="/privacidad">Privacidad</Link>
          <Link className="ghost" href="/instalar">Instalar / QR</Link>
        </div>
      </header>

      <section className="hero">
        <h2>Encuentra la gasolina más cercana y la más barata</h2>
        <p>Elige Regular o Premium para ordenar de la más barata a la más cara. El destino conserva la ruta y marca la gasolinera más barata del camino.</p>
        <div className="actions">
          <button className="primary" onClick={useGps} disabled={loading}>Usar mi ubicación</button>
          <button className="ghost" onClick={() => coords && loadStations(coords)} disabled={loading || !coords}>Actualizar precios</button>
        </div>
        <div className="search-row">
          <input value={query} placeholder="Origen: ciudad, colonia o municipio" onChange={(e) => {
            const value = e.target.value;
            setQuery(value);
            clearTimeout(window.__gasoBuscar);
            window.__gasoBuscar = setTimeout(() => searchCity(value, setSuggestions), 450);
          }} />
        </div>
        {suggestions.length > 0 && (
          <div className="suggestions">
            {suggestions.map((item) => (
              <button key={item.label} className="suggestion" onClick={() => pickPlace(item)}>{item.label}</button>
            ))}
          </div>
        )}
        <div className="dest-box">
          <label htmlFor="destino">Destino</label>
          <div className="search-row">
            <input id="destino" value={destQuery} placeholder="¿A dónde vas?" onChange={(e) => {
              const value = e.target.value;
              setDestQuery(value);
              clearTimeout(window.__gasoDest);
              window.__gasoDest = setTimeout(() => searchCity(value, setDestSuggestions), 450);
            }} />
            <button className="primary" disabled={rutaLoading || !coords || !destino} onClick={() => coords && destino && loadRuta(coords, destino)}>Ruta + más barata</button>
          </div>
          {destSuggestions.length > 0 && (
            <div className="suggestions">
              {destSuggestions.map((item) => (
                <button key={item.label} className="suggestion" onClick={() => pickDestino(item)}>{item.label}</button>
              ))}
            </div>
          )}
        </div>
        <div className="filters">
          {FUELS.map((fuel) => (
            <button key={fuel.id} className={`chip switch-chip ${tipo === fuel.id ? "active" : ""}`} aria-pressed={tipo === fuel.id} onClick={() => setTipo(fuel.id)}>{fuel.label}</button>
          ))}
          {RADIOS.map((km) => (
            <button key={km} className={`chip ${radio === km ? "active" : ""}`} aria-pressed={radio === km} onClick={() => setRadio(km)}>{km} km</button>
          ))}
        </div>
      </section>

      {lugar && (
        <div className="stats">
          <div className="stat"><span>Zona</span><strong>{lugar.split(",")[0]}</strong></div>
          <div className="stat"><span>Promedio {tipo}</span><strong>{money(data?.promedioZona)}</strong></div>
          <div className="stat"><span>Estaciones</span><strong>{data?.totalZona ?? "—"}</strong></div>
        </div>
      )}

      <div className="tabs">
        {[["cercanas", "Más cercanas"], ["baratas", "Más baratas"], ["ruta", "En ruta"], ["mapa", "Mapa"], ["comparar", "Comparar"]].map(([id, label]) => (
          <button key={id} className={`chip ${tab === id ? "active" : ""}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {(loading || rutaLoading) && <div className="loading">{rutaLoading ? "Calculando ruta…" : "Buscando estaciones…"}</div>}
      {error && <div className="error">{error}</div>}
      {!loading && !error && !data && <div className="empty">Toca “Usar mi ubicación” o busca una ciudad.</div>}

      <section className={`panel ${tab === "cercanas" || tab === "baratas" ? "active" : ""}`}>
        {tab === "baratas" && <p className="notice">Orden: {tipo} de la más barata a la más cara.</p>}
        {(list || []).map((station) => <StationCard key={`${tab}-${station.id}`} station={station} />)}
      </section>

      <section className={`panel ${tab === "ruta" ? "active" : ""}`}>
        {!destino && <div className="empty">Escribe un destino. Se conserva la ruta y se marca la más barata.</div>}
        {ruta && coords && destino && (
          <div className="compare-grid">
            <div className="compare-box">
              <h3>Ruta conservada</h3>
              <p>{ruta.distanciaKm} km · {ruta.duracionMin} min</p>
              <div className="card-actions">
                <a href={routeMapsUrl(coords, destino, ruta.mejor)} target="_blank" rel="noreferrer">Ruta + parada barata</a>
                <a href={routeMapsUrl(coords, destino)} target="_blank" rel="noreferrer">Solo destino</a>
              </div>
            </div>
            <div className="compare-box">
              <h3>Más barata en el camino ({tipo})</h3>
              {ruta.mejor ? <><p>{ruta.mejor.name}</p><div className="save">{money(ruta.mejor[tipo])} / L</div></> : <p>Sin precios de {tipo} en la ruta.</p>}
            </div>
          </div>
        )}
        {(ruta?.estaciones || []).map((station) => (
          <StationCard key={`ruta-${station.id}`} station={station} extra={ruta?.mejor?.id === station.id ? <span className="badge green">En ruta</span> : null} />
        ))}
      </section>

      <section className={`panel ${tab === "mapa" ? "active" : ""}`}>
        <div id="map" />
      </section>

      <section className={`panel ${tab === "comparar" ? "active" : ""}`}>
        <div className="compare-grid">
          <div className="compare-box">
            <h3>Mejor precio de {tipo}</h3>
            {data?.mejor ? <><p>{data.mejor.name}</p><div className="save">{money(data.mejor[tipo])} / L</div></> : <p>Aún no hay comparación.</p>}
          </div>
          <div className="compare-box">
            <h3>Tanque 40 L</h3>
            {ahorro && ahorro.porLitro > 0 ? <div className="save">Ahorras {money(ahorro.tanque40)}</div> : <p>Sin ahorro calculado.</p>}
          </div>
        </div>
      </section>

      <nav className="bottom-nav">
        {[["cercanas", "Cercanas"], ["baratas", "Baratas"], ["ruta", "Ruta"], ["mapa", "Mapa"], ["comparar", "Comparar"]].map(([id, label]) => (
          <button key={id} className={`tab ${tab === id ? "active" : ""}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </nav>
    </main>
  );
}
