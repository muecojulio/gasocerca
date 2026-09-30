import { NextResponse } from "next/server";

export async function GET(request) {
  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ error: "Escribe una ciudad o colonia." }, { status: 400 });
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "6");
  url.searchParams.set("countrycodes", "mx");
  url.searchParams.set("q", q);

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": "GasoCerca/1.1 (app familiar de precios de gasolina en Mexico)",
      Accept: "application/json",
    },
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    return NextResponse.json({ error: "No se pudo buscar esa ciudad ahora." }, { status: 502 });
  }

  const raw = await res.json();
  const results = raw.map((item) => ({
    label: item.display_name,
    lat: Number(item.lat),
    lng: Number(item.lon),
  }));

  return NextResponse.json({ results });
}
