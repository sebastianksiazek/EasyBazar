// app/api/geo/geocode/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";

const Body = z.object({
  country: z.string().min(2), // np. "PL"
  region: z.string().min(2), // np. "Mazowieckie"
  city: z.string().min(1), // np. "Warszawa"
});

export async function POST(req: Request) {
  const { country, region, city } = Body.parse(await req.json());

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", country.toLowerCase()); // "pl"
  url.searchParams.set("city", city);
  url.searchParams.set("state", region);

  const resp = await fetch(url.toString(), {
    headers: {
      // Nominatim wymaga identyfikacji klienta
      "User-Agent": "EasyBazar/1.0 (contact@yourdomain.example)",
      Accept: "application/json",
    },
    // (opcjonalnie) Next.js edge cache: next: { revalidate: 86400 }
  });

  if (!resp.ok) {
    return NextResponse.json({ error: `Geocoding failed: ${resp.status}` }, { status: 502 });
  }

  const arr = (await resp.json()) as Array<{ lat: string; lon: string }>;
  if (!arr.length) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  const { lat, lon } = arr[0];
  return NextResponse.json({ latitude: Number(lat), longitude: Number(lon) });
}
