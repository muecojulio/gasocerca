import { NextResponse } from "next/server";
import { estacionesCercanas } from "../../../lib/catalogo";
import { INVALID_FUEL_MESSAGE, parseFuelType } from "../../../lib/fuels.mjs";

export const maxDuration = 10;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const radioKm = Number(searchParams.get("radio") || 8);
  const tipo = parseFuelType(searchParams.get("tipo"));

  if (tipo === null) {
    return NextResponse.json({ error: INVALID_FUEL_MESSAGE }, { status: 400 });
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: "Falta tu ubicación. Activa el GPS o busca una ciudad." },
      { status: 400 }
    );
  }

  if (lat < 14 || lat > 33 || lng < -118.5 || lng > -86) {
    return NextResponse.json(
      { error: "GasoCerca solo cubre México. Ubícate dentro del país o busca una ciudad mexicana." },
      { status: 400 }
    );
  }

  try {
    const data = await estacionesCercanas({ lat, lng, radioKm, tipo });
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "No se pudieron cargar los precios oficiales." },
      { status: 502 }
    );
  }
}
