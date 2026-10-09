import { NextResponse } from "next/server";
import { estacionesEnRuta } from "../../../lib/catalogo";
import { INVALID_FUEL_MESSAGE, parseFuelType } from "../../../lib/fuels.mjs";
import { isMexicoCoordinate } from "../../../lib/geo.mjs";

export const maxDuration = 15;

const MAX_CONCURRENT_ROUTES = 3;
let activeRoutes = 0;

function json(data, status = 200, extraHeaders = {}) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store", ...extraHeaders },
  });
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const fromLat = Number(searchParams.get("fromLat"));
  const fromLng = Number(searchParams.get("fromLng"));
  const toLat = Number(searchParams.get("toLat"));
  const toLng = Number(searchParams.get("toLng"));
  const tipo = parseFuelType(searchParams.get("tipo"));
  const radioKm = Number(searchParams.get("radio") || 3);

  if (tipo === null) return json({ error: INVALID_FUEL_MESSAGE }, 400);

  const nums = [fromLat, fromLng, toLat, toLng];
  if (nums.some((n) => !Number.isFinite(n))) {
    return json({ error: "Falta origen o destino." }, 400);
  }

  if (!isMexicoCoordinate(fromLat, fromLng) || !isMexicoCoordinate(toLat, toLng)) {
    return json({ error: "La ruta debe estar dentro de México." }, 400);
  }

  if (activeRoutes >= MAX_CONCURRENT_ROUTES) {
    return json(
      { error: "Hay muchas rutas en cálculo. Espera un momento e inténtalo de nuevo." },
      429,
      { "Retry-After": "2" },
    );
  }

  activeRoutes += 1;
  try {
    const data = await estacionesEnRuta({
      fromLat,
      fromLng,
      toLat,
      toLng,
      tipo,
      radioKm,
      signal: request.signal,
    });
    return json(data);
  } catch {
    return json({ error: "No se pudo armar la ruta." }, 502);
  } finally {
    activeRoutes -= 1;
  }
}
