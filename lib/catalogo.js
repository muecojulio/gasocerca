import { DEFAULT_FUEL, INVALID_FUEL_MESSAGE, isFuelType, parseFuelType } from "./fuels.mjs";
import { isMexicoCoordinate } from "./geo.mjs";

const PLACES_URL = "https://publicacionexterna.azurewebsites.net/publicaciones/places";
const PRICES_URL = "https://publicacionexterna.azurewebsites.net/publicaciones/prices";
const CACHE_MS = 30 * 60 * 1000;
const CELL = 0.05;

function between(text, open, close) {
  const a = text.indexOf(open);
  if (a === -1) return "";
  const start = a + open.length;
  const b = text.indexOf(close, start);
  if (b === -1) return "";
  return text.slice(start, b).trim();
}

function parsePlaces(xml) {
  const list = [];
  let i = 0;
  while (true) {
    const start = xml.indexOf('<place place_id="', i);
    if (start === -1) break;
    const idStart = start + 17;
    const idEnd = xml.indexOf('"', idStart);
    if (idEnd === -1) break;
    const id = xml.slice(idStart, idEnd);
    const end = xml.indexOf("</place>", idEnd);
    if (end === -1) break;
    const block = xml.slice(idEnd, end);
    const name = between(block, "<name>", "</name>");
    const cre = between(block, "<cre_id>", "</cre_id>");
    const lng = parseFloat(between(block, "<x>", "</x>"));
    const lat = parseFloat(between(block, "<y>", "</y>"));
    if (isMexicoCoordinate(lat, lng) && id) {
      list.push({ id, name: name || "Estación de servicio", cre, lat, lng });
    }
    i = end + 8;
  }
  return list;
}

function parsePrices(xml) {
  const map = new Map();
  let i = 0;
  while (true) {
    const start = xml.indexOf('<place place_id="', i);
    if (start === -1) break;
    const idStart = start + 17;
    const idEnd = xml.indexOf('"', idStart);
    if (idEnd === -1) break;
    const id = xml.slice(idStart, idEnd);
    const end = xml.indexOf("</place>", idEnd);
    if (end === -1) break;
    const block = xml.slice(idEnd, end);
    const current = map.get(id) || { regular: null, premium: null };
    let p = 0;
    while (true) {
      const tag = block.indexOf('<gas_price type="', p);
      if (tag === -1) break;
      const typeStart = tag + 17;
      const typeEnd = block.indexOf('"', typeStart);
      if (typeEnd === -1) break;
      const type = block.slice(typeStart, typeEnd).toLowerCase();
      const valStart = block.indexOf(">", typeEnd) + 1;
      if (valStart === 0) break;
      const valEnd = block.indexOf("</gas_price>", valStart);
      if (valEnd === -1) break;
      const value = parseFloat(block.slice(valStart, valEnd));
      if (Number.isFinite(value) && value > 0 && value < 80 && isFuelType(type)) {
        current[type] = value;
      }
      p = valEnd + 12;
    }
    map.set(id, current);
    i = end + 8;
  }
  return map;
}

export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function cellKey(lat, lng) {
  return `${Math.floor(lat / CELL)}_${Math.floor(lng / CELL)}`;
}

function buildIndex(stations) {
  const grid = new Map();
  for (const station of stations) {
    const key = cellKey(station.lat, station.lng);
    const bucket = grid.get(key);
    if (bucket) bucket.push(station);
    else grid.set(key, [station]);
  }
  return grid;
}

function stationsInBBox(grid, minLat, maxLat, minLng, maxLng) {
  const seen = new Set();
  const out = [];
  const lat0 = Math.floor(minLat / CELL);
  const lat1 = Math.floor(maxLat / CELL);
  const lng0 = Math.floor(minLng / CELL);
  const lng1 = Math.floor(maxLng / CELL);
  for (let i = lat0; i <= lat1; i += 1) {
    for (let j = lng0; j <= lng1; j += 1) {
      const bucket = grid.get(`${i}_${j}`);
      if (!bucket) continue;
      for (const station of bucket) {
        if (seen.has(station.id)) continue;
        if (station.lat < minLat || station.lat > maxLat) continue;
        if (station.lng < minLng || station.lng > maxLng) continue;
        seen.add(station.id);
        out.push(station);
      }
    }
  }
  return out;
}

async function loadCatalog() {
  const now = Date.now();
  if (globalThis.__gasocercaCache && now - globalThis.__gasocercaCache.at < CACHE_MS) {
    return globalThis.__gasocercaCache;
  }
  if (globalThis.__gasocercaCatalogLoad) return globalThis.__gasocercaCatalogLoad;

  const loading = (async () => {
    const signal = AbortSignal.timeout(8000);
    const [placesRes, pricesRes] = await Promise.all([
      fetch(PLACES_URL, { next: { revalidate: 1800 }, cache: "force-cache", signal }),
      fetch(PRICES_URL, { next: { revalidate: 1800 }, cache: "force-cache", signal }),
    ]);
    if (!placesRes.ok || !pricesRes.ok) throw new Error("No se pudieron leer los datos oficiales de la CNE.");
    const [placesXml, pricesXml] = await Promise.all([placesRes.text(), pricesRes.text()]);
    const places = parsePlaces(placesXml);
    const prices = parsePrices(pricesXml);
    const stations = places.map((place) => {
      const price = prices.get(place.id) || { regular: null, premium: null };
      return { ...place, regular: price.regular, premium: price.premium };
    });
    const payload = { at: now, updatedAt: new Date().toISOString(), stations, grid: buildIndex(stations) };
    globalThis.__gasocercaCache = payload;
    return payload;
  })();

  globalThis.__gasocercaCatalogLoad = loading;
  try {
    return await loading;
  } finally {
    if (globalThis.__gasocercaCatalogLoad === loading) delete globalThis.__gasocercaCatalogLoad;
  }
}

function normalizeFuel(tipo) {
  const fuel = parseFuelType(tipo);
  if (fuel === null) throw new Error(INVALID_FUEL_MESSAGE);
  return fuel;
}

export async function estacionesCercanas({ lat, lng, radioKm = 5, tipo = DEFAULT_FUEL }) {
  const catalog = await loadCatalog();
  const fuel = normalizeFuel(tipo);
  const radio = Math.min(Math.max(Number(radioKm) || 5, 1), 40);
  const pad = radio / 111;
  const candidates = stationsInBBox(catalog.grid, lat - pad, lat + pad, lng - pad, lng + pad);
  const nearby = [];
  for (const station of candidates) {
    const distance = haversineKm(lat, lng, station.lat, station.lng);
    if (distance <= radio) nearby.push({ ...station, distance: Number(distance.toFixed(2)) });
  }
  const withPrice = nearby.filter((s) => s[fuel] != null);
  const cheapest = [...withPrice].sort((a, b) => a[fuel] - b[fuel] || a.distance - b.distance);
  const closest = [...nearby].sort((a, b) => a.distance - b.distance);
  const avg = withPrice.length > 0 ? withPrice.reduce((sum, s) => sum + s[fuel], 0) / withPrice.length : null;
  return {
    updatedAt: catalog.updatedAt,
    promedioZona: avg ? Number(avg.toFixed(2)) : null,
    totalZona: nearby.length,
    cercanas: closest.slice(0, 40),
    baratas: cheapest.slice(0, 40),
    mejor: cheapest[0] || null,
    masCercana: closest[0] || null,
  };
}

function sampleCoords(coords, stepKm = 2.5) {
  if (!coords.length) return [];
  const samples = [coords[0]];
  let acc = 0;
  for (let i = 1; i < coords.length; i += 1) {
    const prev = coords[i - 1];
    const curr = coords[i];
    acc += haversineKm(prev[1], prev[0], curr[1], curr[0]);
    if (acc >= stepKm) {
      samples.push(curr);
      acc = 0;
    }
  }
  samples.push(coords[coords.length - 1]);
  return samples;
}

export async function estacionesEnRuta({ fromLat, fromLng, toLat, toLng, tipo = "regular", radioKm = 3, signal: requestSignal }) {
  const fuel = normalizeFuel(tipo);
  const corridor = Math.min(Math.max(Number(radioKm) || 3, 1), 8);
  const osrm = new URL(`https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}`);
  osrm.searchParams.set("overview", "full");
  osrm.searchParams.set("geometries", "geojson");
  osrm.searchParams.set("alternatives", "false");
  const timeout = AbortSignal.timeout(12000);
  const signal = requestSignal ? AbortSignal.any([requestSignal, timeout]) : timeout;
  const [catalog, routeRes] = await Promise.all([
    loadCatalog(),
    fetch(osrm.toString(), {
      headers: { "User-Agent": "GasoCerca/1.2 (+https://github.com/muecojulio/gasocerca)" },
      cache: "no-store",
      signal,
    }),
  ]);
  if (!routeRes.ok) throw new Error("No se pudo calcular la ruta ahora.");
  const routeJson = await routeRes.json();
  const route = routeJson.routes?.[0];
  const coordinates = route?.geometry?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2 || coordinates.length > 20000) {
    throw new Error("No hay una ruta manejable entre esos puntos.");
  }
  const line = coordinates.flatMap((point) => {
    if (!Array.isArray(point) || point.length < 2) return [];
    const lng = Number(point[0]);
    const lat = Number(point[1]);
    return isMexicoCoordinate(lat, lng) ? [[lng, lat]] : [];
  });
  if (line.length < 2 || !Number.isFinite(route.distance) || !Number.isFinite(route.duration)) {
    throw new Error("No hay una ruta manejable entre esos puntos.");
  }
  const samples = sampleCoords(line, 2.2);
  const found = new Map();
  for (const [lng, lat] of samples) {
    const pad = corridor / 111;
    const candidates = stationsInBBox(catalog.grid, lat - pad, lat + pad, lng - pad, lng + pad);
    for (const station of candidates) {
      const distance = haversineKm(lat, lng, station.lat, station.lng);
      if (distance > corridor) continue;
      const prev = found.get(station.id);
      if (!prev || distance < prev.desvioKm) {
        found.set(station.id, { ...station, desvioKm: Number(distance.toFixed(2)) });
      }
    }
  }
  const along = [...found.values()];
  const withPrice = along.filter((s) => s[fuel] != null);
  const baratas = [...withPrice].sort((a, b) => a[fuel] - b[fuel] || a.desvioKm - b.desvioKm);
  return {
    distanciaKm: Number((route.distance / 1000).toFixed(2)),
    duracionMin: Math.round(route.duration / 60),
    geometry: line,
    estaciones: baratas.slice(0, 30),
    mejor: baratas[0] || null,
  };
}
