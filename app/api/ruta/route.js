import { NextResponse } from "next/server";
import { estacionesEnRuta } from "../../../lib/catalogo";
import { INVALID_FUEL_MESSAGE, parseFuelType } from "../../../lib/fuels.mjs";

export const maxDuration = 15;

function json(data, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "public, s-maxage=180, stale-while-revalidate=300",
    },
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

  const inMx = (lat, lng) => lat >= 14 && lat <= 33 && lng >= -118.5 && lng <= -86;
  if (!inMx(fromLat, fromLng) || !inMx(toLat, toLng)) {
    return json({ error: "La ruta debe estar dentro de México." }, 400);
  }

  try {
    const data = await estacionesEnRuta({ fromLat, fromLng, toLat, toLng, tipo, radioKm });
    return json(data);
  } catch (error) {
    return json({ error: error.message || "No se pudo armar la ruta." }, 502);
  }
}
