import { NextResponse } from "next/server";
import { isMexicoCoordinate } from "../../../lib/geo.mjs";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 120;
const MAX_PENDING_LOOKUPS = 6;
const MIN_LOOKUP_INTERVAL_MS = 1000;
const LOOKUP_TIMEOUT_MS = 7000;

let lookupQueue = Promise.resolve();
let pendingLookups = 0;
let nextLookupAt = 0;

function json(data, status = 200, extraHeaders = {}) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store", ...extraHeaders },
  });
}

async function lookupPlaces(url, request) {
  if (pendingLookups >= MAX_PENDING_LOOKUPS) return null;
  pendingLookups += 1;

  const task = lookupQueue.then(async () => {
    if (request.signal.aborted) throw new DOMException("Request aborted", "AbortError");
    const waitMs = Math.max(0, nextLookupAt - Date.now());
    if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));
    if (request.signal.aborted) throw new DOMException("Request aborted", "AbortError");

    nextLookupAt = Date.now() + MIN_LOOKUP_INTERVAL_MS;
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(LOOKUP_TIMEOUT_MS)]);
    return fetch(url, {
      cache: "no-store",
      signal,
      headers: {
        "User-Agent": "GasoCerca/1.2 (+https://github.com/muecojulio/gasocerca)",
        Accept: "application/json",
      },
    });
  });

  lookupQueue = task.then(() => undefined, () => undefined);
  task.then(
    () => { pendingLookups -= 1; },
    () => { pendingLookups -= 1; },
  );
  return task;
}

export const maxDuration = 15;

export async function GET(request) {
  const rawQuery = new URL(request.url).searchParams.get("q") || "";
  const q = rawQuery.replace(/[\u0000-\u001f\u007f]/gu, " ").replace(/\s+/gu, " ").trim();
  if (q.length < MIN_QUERY_LENGTH) {
    return json({ error: "Escribe una ciudad o colonia." }, 400);
  }
  if (q.length > MAX_QUERY_LENGTH) {
    return json({ error: "La búsqueda es demasiado larga." }, 400);
  }

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "6");
  url.searchParams.set("countrycodes", "mx");
  url.searchParams.set("q", q);

  try {
    const response = await lookupPlaces(url, request);
    if (!response) {
      return json({ error: "Hay muchas búsquedas al mismo tiempo. Espera un momento e inténtalo de nuevo." }, 429, { "Retry-After": "1" });
    }
    if (!response.ok) return json({ error: "No se pudo buscar esa ciudad ahora." }, 502);

    const raw = await response.json();
    if (!Array.isArray(raw)) return json({ error: "No se pudo leer la respuesta de lugares." }, 502);

    const results = raw.slice(0, 6).flatMap((item) => {
      if (typeof item?.display_name !== "string") return [];
      const label = item.display_name.trim().slice(0, 240);
      const lat = Number(item.lat);
      const lng = Number(item.lon);
      if (!label || !isMexicoCoordinate(lat, lng)) return [];
      return [{ label, lat, lng }];
    });

    return json({ results });
  } catch (error) {
    if (error?.name === "TimeoutError") {
      return json({ error: "La búsqueda tardó demasiado. Inténtalo de nuevo." }, 504);
    }
    return json({ error: "No se pudo buscar esa ciudad ahora." }, 502);
  }
}
