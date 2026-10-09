"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FUELS, money, RADIOS, routeMapsUrl, searchPlaces, SECTIONS } from "../lib/gasocerca";
import { normalizeSearch } from "../lib/interactions.mjs";
import StationCard from "./components/StationCard";
import StationMap from "./components/StationMap";
import InstallPanel from "./components/InstallPanel";
import PrivacyContent from "./components/PrivacyContent";
import CardCarousel from "./components/interactions/CardCarousel";
import Disclosure from "./components/interactions/Disclosure";
import FeedbackButton, { FeedbackMessage } from "./components/interactions/FeedbackButton";
import ScrollRail from "./components/interactions/ScrollRail";
import SearchCombobox from "./components/interactions/SearchCombobox";
import SectionTabs from "./components/interactions/SectionTabs";
import TabPanels from "./components/interactions/TabPanels";
import useApiRequest from "./components/interactions/useApiRequest";

export default function HomePage() {
  const [tab, setTab] = useState("cercanas");
  const [tipo, setTipo] = useState(FUELS[0].id);
  const [radio, setRadio] = useState(8);
  const [coords, setCoords] = useState(null);
  const [lugar, setLugar] = useState("");
  const [query, setQuery] = useState("");
  const [destQuery, setDestQuery] = useState("");
  const [destino, setDestino] = useState(null);
  const [gpsStatus, setGpsStatus] = useState("idle");
  const [gpsError, setGpsError] = useState("");
  const [formError, setFormError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const gpsOperation = useRef(null);
  const stations = useApiRequest();
  const route = useApiRequest();
  const data = stations.data;
  const ruta = route.data;
  const fuelLabel = FUELS.find((fuel) => fuel.id === tipo).label;
  const dataUpdatedLabel = data?.updatedAt
    ? new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(data.updatedAt))
    : "";
  const stationsUrl = coords ? `/api/estaciones?lat=${coords.lat}&lng=${coords.lng}&radio=${radio}&tipo=${tipo}` : null;
  const routeUrl = coords && destino ? `/api/ruta?fromLat=${coords.lat}&fromLng=${coords.lng}&toLat=${destino.lat}&toLng=${destino.lng}&tipo=${tipo}&radio=3` : null;

  const refreshStations = useCallback(async () => {
    if (!stationsUrl) return;
    const json = await stations.request(stationsUrl);
    if (json) setAnnouncement(`${json.totalZona} estaciones encontradas. Precios actualizados.`);
  }, [stationsUrl, stations.request]);

  const calculateRoute = useCallback(async () => {
    if (!routeUrl) return;
    const json = await route.request(routeUrl);
    if (json) {
      setTab("ruta");
      setAnnouncement(`Ruta calculada: ${json.distanciaKm} kilómetros, ${json.duracionMin} minutos. Tu destino se conserva.`);
    }
  }, [routeUrl, route.request]);

  useEffect(() => { refreshStations(); }, [refreshStations]);
  useEffect(() => { calculateRoute(); }, [calculateRoute]);
  useEffect(() => () => { gpsOperation.current = null; }, []);

  function useGps() {
    if (gpsOperation.current) return;
    setGpsError("");
    setFormError("");
    if (!navigator.geolocation) {
      setGpsStatus("error");
      setGpsError("Este dispositivo no permite geolocalización. Busca una ciudad.");
      return;
    }
    const operation = Symbol("gps");
    gpsOperation.current = operation;
    setGpsStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (gpsOperation.current !== operation) return;
        gpsOperation.current = null;
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLugar("Tu ubicación actual");
        setQuery("");
        setGpsStatus("success");
        setAnnouncement("Ubicación encontrada. Cargando precios de tu zona.");
      },
      () => {
        if (gpsOperation.current !== operation) return;
        gpsOperation.current = null;
        setGpsStatus("error");
        setGpsError("No se pudo leer el GPS. Acepta el permiso de ubicación o busca una ciudad.");
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }

  function pickPlace(place) {
    // Ignore an outstanding GPS callback if a city was chosen in the meantime.
    gpsOperation.current = null;
    setGpsStatus("idle");
    setGpsError("");
    setFormError("");
    setCoords({ lat: place.lat, lng: place.lng });
    setLugar(place.label);
    setQuery(place.label.split(",")[0]);
  }

  function pickDestino(place) {
    setDestino({ lat: place.lat, lng: place.lng, label: place.label });
    setDestQuery(place.label.split(",")[0]);
    setFormError(coords ? "" : "Primero elige tu origen (GPS o ciudad). Tu destino no se pierde.");
  }

  const cheapest = useMemo(() => [...(data?.baratas || [])].sort((a, b) => {
    if (a[tipo] == null) return b[tipo] == null ? 0 : 1;
    if (b[tipo] == null) return -1;
    return a[tipo] - b[tipo] || a.distance - b.distance;
  }), [data, tipo]);

  const ahorro = useMemo(() => {
    if (!data?.mejor || !data?.promedioZona || data.mejor[tipo] == null) return null;
    const porLitro = data.promedioZona - data.mejor[tipo];
    return { porLitro, tanque40: porLitro * 40 };
  }, [data, tipo]);

  const gpsBusy = gpsStatus === "loading";
  const stationsBusy = stations.status === "loading";
  const routeBusy = route.status === "loading";
  const busy = gpsBusy || stationsBusy || routeBusy;
  const errors = [gpsError, formError, stations.error, route.error].filter(Boolean);
  const statusMessage = gpsBusy ? "Buscando tu ubicación…" : routeBusy ? "Calculando ruta…" : stationsBusy ? "Buscando estaciones…" : errors.length ? "" : announcement;
  const originSelection = coords && normalizeSearch(query) === normalizeSearch(lugar.split(",")[0]) ? { ...coords, label: lugar } : null;
  const destinationSelected = destino && normalizeSearch(destQuery) === normalizeSearch(destino.label.split(",")[0]);

  function renderStations(list, inRoute = false) {
    return (
      <div className="station-list" aria-busy={(inRoute ? routeBusy : stationsBusy) || undefined}>
        {list.map((station) => (
          <StationCard
            key={station.id} station={station} tipo={tipo} inRoute={inRoute}
            best={station.id === (inRoute ? ruta?.mejor?.id : data?.mejor?.id)}
            closest={!inRoute && station.id === data?.masCercana?.id}
          />
        ))}
        {data && !list.length && !busy && !inRoute && <div className="empty">No se encontraron estaciones {tab === "baratas" ? `con precio de ${fuelLabel}` : ""} en este radio. Prueba ampliarlo.</div>}
      </div>
    );
  }

  const panels = {
    cercanas: <><h2 className="section-heading">Gasolineras más cercanas</h2>{renderStations(data?.cercanas || [])}</>,
    baratas: <><h2 className="section-heading">Gasolineras más baratas</h2><p className="notice">Orden: {fuelLabel}, de la más barata a la más cara.</p>{renderStations(cheapest)}</>,
    ruta: <>
      <h2 className="section-heading">En tu ruta</h2>
      {!destino && <div className="empty">Escribe un destino. Se conserva la ruta y se marca la más barata.</div>}
      {destino && <p className="notice">Destino de la ruta: {destino.label}</p>}
      {destino && !coords && <div className="empty">Elige tu origen para calcular la ruta hacia tu destino.</div>}
      {ruta && coords && destino && (
        <CardCarousel label="Resumen de tu ruta">
          <div className="compare-box">
            <h3>Ruta conservada</h3>
            <p>{ruta.distanciaKm} km · {ruta.duracionMin} min</p>
            <div className="card-actions">
              <a href={routeMapsUrl(coords, destino, ruta.mejor)} target="_blank" rel="noopener noreferrer" aria-label="Ruta con parada barata en Google Maps (abre en otra pestaña)">Ruta + parada barata <span aria-hidden="true">↗</span></a>
              <a href={routeMapsUrl(coords, destino)} target="_blank" rel="noopener noreferrer" aria-label="Ruta solo al destino en Google Maps (abre en otra pestaña)">Solo destino <span aria-hidden="true">↗</span></a>
            </div>
          </div>
          <div className="compare-box">
            <h3>Más barata en el camino ({fuelLabel})</h3>
            {ruta.mejor ? <><p>{ruta.mejor.name}</p><div className="save">{money(ruta.mejor[tipo])} / L</div></> : <p>Sin precios de {fuelLabel} en la ruta.</p>}
          </div>
        </CardCarousel>
      )}
      {renderStations(ruta?.estaciones || [], true)}
    </>,
    mapa: <><h2 className="section-heading">Mapa de estaciones</h2><StationMap active={tab === "mapa"} coords={coords} data={data} tipo={tipo} destino={destino} ruta={ruta} /></>,
    comparar: <>
      <h2 className="section-heading">Compara y ahorra</h2>
      <CardCarousel label="Comparación de precios">
        <div className="compare-box">
          <h3>Mejor precio de {fuelLabel}</h3>
          {data?.mejor ? <><p>{data.mejor.name}</p><div className="save">{money(data.mejor[tipo])} / L</div></> : <p>Aún no hay comparación.</p>}
        </div>
        <div className="compare-box">
          <h3>Tanque de 40 L</h3>
          {ahorro && ahorro.porLitro > 0 ? <div className="save">Ahorras {money(ahorro.tanque40)}</div> : <p>Sin ahorro calculado.</p>}
        </div>
      </CardCarousel>
    </>,
    privacidad: <div className="legal-content">
      <h2 className="section-heading">Política de privacidad</h2>
      <PrivacyContent headingLevel="h3" />
    </div>,
    instalar: <InstallPanel />,
  };

  return (
    <main className="app-shell">
      <a className="skip-link" href={`#section-panel-${tab}`}>Saltar a la sección seleccionada</a>
      <header className="topbar">
        <div className="brand">
          <img src="/icon-192.png" alt="" width="42" height="42" />
          <div><h1>GasoCerca</h1><p>Precios oficiales en México</p></div>
        </div>
      </header>

      <section className="hero" aria-labelledby="search-title">
        <div className="hero-intro">
          <div className="hero-copy">
            <p className="hero-kicker"><span aria-hidden="true">✦</span> EXPLORA · COMPARA · AHORRA</p>
            <h2 id="search-title">La ruta es tuya.<br /><span className="hero-emphasis">El ahorro, también.</span></h2>
            <p>Encuentra gasolina cerca de ti, compara precios reportados a la CNE y encuentra una parada económica sin perder tu destino.</p>
            <div className="hero-proof"><span className="proof-dot" aria-hidden="true" /> Datos públicos de México <span className="proof-separator" aria-hidden="true">·</span> Sin cuenta, sin vueltas</div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <span className="hero-sun">G$</span>
            <svg className="hero-route-art" viewBox="0 0 260 210" fill="none" focusable="false">
              <path d="M18 112 C58 48 89 176 134 123 S194 43 245 74" />
            </svg>
            <div className="hero-pump"><span className="pump-glass">G</span><span className="pump-hose" /></div>
            <div className="hero-sticker"><strong>¡VÁMONOS!</strong><span>Tu próxima parada</span></div>
            <span className="hero-spark hero-spark-a">✷</span>
          </div>
        </div>
        <div className="actions">
          <FeedbackButton className="primary" status={gpsStatus} onClick={useGps} disabled={stationsBusy} loadingLabel="Obteniendo ubicación…" successLabel="Ubicación lista" errorLabel="Reintentar ubicación"><><span className="action-glyph" aria-hidden="true">⌖</span>Usar mi ubicación</></FeedbackButton>
          <FeedbackButton status={stations.status} onClick={refreshStations} disabled={gpsBusy || !coords} loadingLabel="Actualizando precios…" successLabel="Precios actualizados" errorLabel="Reintentar precios"><><span className="action-glyph" aria-hidden="true">↻</span>Actualizar precios</></FeedbackButton>
        </div>
        <SearchCombobox id="origen" label="Origen" value={query} onChange={setQuery} onSelect={pickPlace} selectedOption={originSelection} loadOptions={searchPlaces} placeholder="Ciudad, colonia o municipio" />

        <Disclosure title="Destino y ruta" className="dest-box">
          <div className="destination-fields">
            <SearchCombobox id="destino" label="Destino" value={destQuery} onChange={setDestQuery} onSelect={pickDestino} selectedOption={destinationSelected ? destino : null} loadOptions={searchPlaces} placeholder="¿A dónde vas?" />
            <FeedbackButton className="primary route-button" status={route.status} disabled={!coords || !destinationSelected || gpsBusy} onClick={calculateRoute} loadingLabel="Calculando ruta…" successLabel="Ruta lista" errorLabel="Reintentar ruta"><><span className="action-glyph" aria-hidden="true">➜</span>Ruta + más barata</></FeedbackButton>
          </div>
          {destino && <p className="field-help saved-destination">Destino guardado: {destino.label}</p>}
        </Disclosure>

        <div className="filters" role="group" aria-label="Filtros">
          <ScrollRail label="Combustible" selectedKey={tipo} hint>
            {FUELS.map((fuel) => (
              <button type="button" key={fuel.id} data-rail-key={fuel.id} className={`chip ${tipo === fuel.id ? "active" : ""}`} aria-pressed={tipo === fuel.id} onClick={() => setTipo(fuel.id)}>
                <span className="selection-mark" aria-hidden="true">{tipo === fuel.id ? "✓" : ""}</span>{fuel.label}
              </button>
            ))}
          </ScrollRail>
          <ScrollRail label="Radio de búsqueda" selectedKey={radio} hint>
            {RADIOS.map((km) => (
              <button type="button" key={km} data-rail-key={km} className={`chip ${radio === km ? "active" : ""}`} aria-pressed={radio === km} onClick={() => setRadio(km)}>
                <span className="selection-mark" aria-hidden="true">{radio === km ? "✓" : ""}</span>{km} km
              </button>
            ))}
          </ScrollRail>
        </div>
      </section>

      {lugar && (
        <div className="stats" role="group" aria-label="Resumen de la zona">
          <div className="stat"><span><span aria-hidden="true">⌖</span> Zona</span><strong>{lugar.split(",")[0]}</strong></div>
          <div className="stat"><span><span aria-hidden="true">＄</span> Promedio {fuelLabel}</span><strong>{money(data?.promedioZona)}</strong></div>
          <div className="stat"><span><span aria-hidden="true">✦</span> Estaciones</span><strong>{data?.totalZona ?? "—"}</strong></div>
        </div>
      )}
      {dataUpdatedLabel && <p className="data-stamp"><span aria-hidden="true" />Consulta del catálogo CNE: <time dateTime={data.updatedAt}>{dataUpdatedLabel}</time></p>}

      <SectionTabs items={SECTIONS} value={tab} onChange={setTab} />
      <div className={statusMessage ? `${busy ? "loading" : "notice"} feedback-message` : "sr-only"} role="status" aria-live="polite" aria-atomic="true">
        {statusMessage && <span className={`feedback-icon ${busy ? "spinner" : ""}`} aria-hidden="true">{busy ? "" : "✓"}</span>}
        <span>{statusMessage}</span>
      </div>
      {errors.length > 0 && <FeedbackMessage tone="error">{errors.join(" ")}</FeedbackMessage>}
      {!busy && !errors.length && !data && <div className="empty">Toca “Usar mi ubicación” o busca una ciudad y elígela de la lista.</div>}
      <TabPanels items={SECTIONS} value={tab} onChange={setTab} panels={panels} />
      <footer className="site-footer">
        <span><strong>GasoCerca</strong> · Precios para salir con confianza.</span>
        <nav className="site-footer-links" aria-label="Información de GasoCerca">
          <Link href="/privacidad">Privacidad</Link>
          <Link href="/instalar">Instalar la app</Link>
        </nav>
      </footer>
    </main>
  );
}
