// app/api/listings/route.ts
import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { createClient } from "@/lib/supabase-server";

/* ========== Typy zgodne z tabelą ========== */
type ListingStatus = "active" | "sold" | "hidden";

type ListingRow = {
  id: number; // int8
  owner: string; // uuid
  title: string; // text
  description: string; // text
  price_cents: number; // int4
  category_id: number | null; // int8
  status: ListingStatus | null; // text
  created_at: string; // timestamptz
  city: string | null;
  region: string | null;
  country: string | null;
  latitude: number | null; // float8
  longitude: number | null; // float8
};

type ListingInsertDb = Omit<ListingRow, "id" | "created_at">;

type BaseLoc = {
  country: string | null;
  region: string | null;
  city: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

/* ========== Helpery ========== */
const toCents = (pln: number) => Math.round(pln * 100);

// Domyślny generyk = payload INSERT bez 'owner'.
// Dzięki temu wywołanie nie wymaga <...>.
async function geocodeIfNeeded<T extends BaseLoc>(
  payload: T
): Promise<Omit<T, "latitude" | "longitude"> & { latitude: number; longitude: number }> {
  const hasLat = payload.latitude !== undefined && payload.latitude !== null;
  const hasLon = payload.longitude !== undefined && payload.longitude !== null;

  if (hasLat && hasLon) {
    // już mamy koordy – upewniamy się, że są typu number
    return {
      ...(payload as Omit<T, "latitude" | "longitude">),
      latitude: Number(payload.latitude),
      longitude: Number(payload.longitude),
    };
  }

  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/geo/geocode`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      country: payload.country,
      region: payload.region,
      city: payload.city,
    }),
  });
  if (!res.ok) throw new Error("Geocoding failed");
  const { latitude, longitude } = await res.json();

  return {
    ...(payload as Omit<T, "latitude" | "longitude">),
    latitude,
    longitude,
  };
}

function errorMessage(e: unknown) {
  if (e instanceof ZodError) return e.issues.map((i) => i.message).join(", ");
  if (e instanceof Error) return e.message;
  return "Invalid request";
}

/* ========== Zod w pliku ========== */
const ListingCreateSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(5000),
  price: z.number().positive(), // w zł — backend zamienia na grosze
  category_id: z.coerce.number().int().optional(),
  status: z.enum(["active", "sold", "hidden"]).optional(),
  country: z.string().min(2),
  region: z.string().min(2),
  city: z.string().min(1),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  q: z.string().trim().optional(),
  country: z.string().optional(),
  region: z.string().optional(),
  city: z.string().optional(),
  owner: z.enum(["me"]).optional(), // ?owner=me
});

/* ========== GET /api/listings (lista) ========== */
export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const url = new URL(req.url);
    const qp = ListQuerySchema.parse(Object.fromEntries(url.searchParams));

    const {
      data: { user },
    } = await supabase.auth.getUser();

    let query = supabase
      .from("listings")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((qp.page - 1) * qp.limit, qp.page * qp.limit - 1);

    if (qp.q) query = query.or(`title.ilike.%${qp.q}%,description.ilike.%${qp.q}%`);
    if (qp.country) query = query.eq("country", qp.country);
    if (qp.region) query = query.eq("region", qp.region);
    if (qp.city) query = query.eq("city", qp.city);
    if (qp.owner === "me" && user) query = query.eq("owner", user.id);

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({
      page: qp.page,
      limit: qp.limit,
      total: count ?? 0,
      items: data ?? [],
    });
  } catch (e) {
    return NextResponse.json({ error: errorMessage(e) }, { status: 400 });
  }
}

/* ========== POST /api/listings (tworzenie) ========== */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parsed = ListingCreateSchema.strict().parse(await req.json());

    let listingForDb: Omit<ListingInsertDb, "owner"> = {
      title: parsed.title,
      description: parsed.description,
      price_cents: toCents(parsed.price),
      category_id: parsed.category_id ?? null,
      status: parsed.status ?? "active",
      country: parsed.country,
      region: parsed.region,
      city: parsed.city,
      latitude: parsed.latitude ?? null, // null (nie NaN)
      longitude: parsed.longitude ?? null, // null (nie NaN)
    };

    // Uzupełnij współrzędne (typowo poprawnie dzięki domyślnemu generykowi)
    listingForDb = await geocodeIfNeeded<Omit<ListingInsertDb, "owner">>(listingForDb);

    const insertPayload: ListingInsertDb = {
      ...listingForDb,
      owner: user.id, // nigdy z body
    };

    const { data, error } = await supabase
      .from("listings")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: errorMessage(e) }, { status: 400 });
  }
}
