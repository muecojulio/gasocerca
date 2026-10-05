import { normalizeSearch } from "./interactions.mjs";

export { FUELS } from "./fuels.mjs";
export const RADIOS = [3, 5, 8, 15, 25];
export const SECTIONS = [
  { id: "cercanas", label: "Más cercanas", shortLabel: "Cercanas" },
  { id: "baratas", label: "Más baratas", shortLabel: "Baratas" },
  { id: "ruta", label: "En ruta", shortLabel: "Ruta" },
  { id: "mapa", label: "Mapa", shortLabel: "Mapa" },
  { id: "comparar", label: "Comparar", shortLabel: "Comparar" },
];

export function money(n) {
  return n == null ? "—" : `$${Number(n).toFixed(2)}`;
}

export function mapsUrl(station) {
  return `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`;
}

export function wazeUrl(station) {
  return `https://waze.com/ul?ll=${station.lat},${station.lng}&navigate=yes`;
}

export function routeMapsUrl(origin, dest, via) {
  const params = new URLSearchParams({
    api: "1",
    origin: `${origin.lat},${origin.lng}`,
    destination: `${dest.lat},${dest.lng}`,
    travelmode: "driving",
  });
  if (via) params.set("waypoints", `${via.lat},${via.lng}`);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export async function searchPlaces(text, { signal } = {}) {
  // The same query key works for México/mexico and MÉRIDA/merida.
  try {
    const res = await fetch(`/api/buscar?q=${encodeURIComponent(normalizeSearch(text))}`, { signal });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "No se pudo buscar ese lugar. Intenta de nuevo.");
    return json.results || [];
  } catch (error) {
    if (error.name === "AbortError") throw error;
    if (error instanceof TypeError || error instanceof SyntaxError) {
      throw new Error("No se pudo buscar ese lugar. Revisa tu conexión e intenta de nuevo.");
    }
    throw error;
  }
}

export function placeKey(place) {
  return place ? `${place.lat},${place.lng}` : "";
}
