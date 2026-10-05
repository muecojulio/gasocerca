"use client";

import { useId } from "react";
import { FUELS, mapsUrl, money, wazeUrl } from "../../lib/gasocerca";
import SwipeActions from "./interactions/SwipeActions";

export default function StationCard({ station, tipo, best = false, closest = false, inRoute = false }) {
  const titleId = useId();
  return (
    <SwipeActions
      label={station.name} labelledBy={titleId} className={best ? "card-highlight" : ""}
      actions={<>
        <a href={mapsUrl(station)} target="_blank" rel="noopener noreferrer" aria-label={`Cómo llegar a ${station.name} con Google Maps (abre en otra pestaña)`}>Cómo llegar <span aria-hidden="true">↗</span></a>
        <a href={wazeUrl(station)} target="_blank" rel="noopener noreferrer" aria-label={`Ir a ${station.name} con Waze (abre en otra pestaña)`}>Waze <span aria-hidden="true">↗</span></a>
      </>}
    >
      <div className="card-top">
        <h3 id={titleId}>{station.name}</h3>
        <div className="station-badges">
          {closest && <span className="badge gold">Más cerca</span>}
          {best && <span className="badge green"><span aria-hidden="true">✓ </span>{inRoute ? "Más barata en ruta" : "Más barata"}</span>}
        </div>
      </div>
      <p className="meta">{station.distance != null ? `${station.distance} km` : `Desvío ${station.desvioKm} km`} · permiso {station.cre || "CNE"}</p>
      <div className="prices" role="group" aria-label="Precios por litro">
        {FUELS.map((fuel) => (
          <div key={fuel.id} className={`price-pill ${tipo === fuel.id ? "selected" : ""}`}>
            <small>
              {fuel.label}
              {tipo === fuel.id && <><span className="fuel-check" aria-hidden="true"> ✓</span><span className="sr-only">, combustible seleccionado</span></>}
            </small>
            <b>{money(station[fuel.id])}</b>
            <span className="sr-only"> por litro</span>
          </div>
        ))}
      </div>
    </SwipeActions>
  );
}
