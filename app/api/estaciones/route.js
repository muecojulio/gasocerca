import { NextResponse } from "next/server";
import { estacionesCercanas } from "../../../lib/catalogo";
import { INVALID_FUEL_MESSAGE, parseFuelType } from "../../../lib/fuels.mjs";
import { isMexicoCoordinate } from "../../../lib/geo.mjs";

export const maxDuration = 10;

function json(data, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const radioKm = Number(searchParams.get("radio") || 8);
  const tipo = parseFuelType(searchParams.get("tipo"));

  if (tipo === null) return json({ error: INVALID_FUEL_MESSAGE }, 400);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return json({ error: "Falta tu ubicación. Activa el GPS o busca una ciudad." }, 400);
  }

  if (!isMexicoCoordinate(lat, lng)) {
    return json({ error: "GasoCerca solo cubre México. Ubícate dentro del país o busca una ciudad mexicana." }, 400);
  }

  try {
    const data = await estacionesCercanas({ lat, lng, radioKm, tipo });
    return json(data);
  } catch {
    return json({ error: "No se pudieron cargar los precios oficiales." }, 502);
  }
}
