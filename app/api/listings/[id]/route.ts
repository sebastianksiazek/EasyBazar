import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { createClient } from "@/lib/supabase-server";

/* ===========================
   Typy i helpery
=========================== */
type ListingStatus = "active" | "sold" | "hidden";

type ListingRow = {
  id: number; // int8
  owner: string; // uuid
  title: string; // text
  description: string; // text
  price_cents: number; // int4
  category_id: number | null; // int8
  status: ListingStatus | null;
  created_at: string; // timestamptz
  city: string | null;
  region: string | null;
  country: string | null;
  latitude: number | null; // float8
  longitude: number | null; // float8
};

type ListingUpdateDb = Partial<Omit<ListingRow, "id" | "owner" | "created_at">>;

type BaseLoc = {
  country: string | null;
  region: string | null;
  city: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

const toCents = (pln: number) => Math.round(pln * 100);

async function geocodeIfNeeded<T extends BaseLoc>(
  payload: T
): Promise<Omit<T, "latitude" | "longitude"> & { latitude: number; longitude: number }> {
  const hasLat = payload.latitude !== undefined && payload.latitude !== null;
  const hasLon = payload.longitude !== undefined && payload.longitude !== null;

  if (hasLat && hasLon) {
    return {
      ...(payload as Omit<T, "latitude" | "longitude">),
      latitude: Number(payload.latitude),
      longitude: Number(payload.longitude),
    };
  }

  if (!payload.country || !payload.region || !payload.city) {
    throw new Error("Missing country/region/city for geocoding");
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

/* ===========================
   Walidacja Zod (update)
=========================== */
const ListingUpdateSchema = z
  .object({
    title: z.string().min(3).max(120).optional(),
    description: z.string().min(10).max(5000).optional(),
    price: z.number().positive().optional(), // w zł – zapis do price_cents
    category_id: z.number().int().optional(),
    status: z.enum(["active", "sold", "hidden"]).optional(),
    country: z.string().min(2).optional(),
    region: z.string().min(2).optional(),
    city: z.string().min(1).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: "No fields to update" });

type ListingUpdate = z.infer<typeof ListingUpdateSchema>;

/* ===========================
   GET /api/listings/:id
=========================== */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();

    const { id } = await ctx.params; // 👈 params to Promise
    const numericId = Number(id);

    const { data, error } = await supabase
      .from("listings")
      .select("*")
      .eq("id", numericId)
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: errorMessage(e) }, { status: 404 });
  }
}

/* ===========================
   PUT /api/listings/:id
=========================== */
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await ctx.params; // 👈 await
    const numericId = Number(id);

    const patch: ListingUpdate = ListingUpdateSchema.parse(await req.json());

    const patchDb: ListingUpdateDb = {};
    if (patch.title !== undefined) patchDb.title = patch.title;
    if (patch.description !== undefined) patchDb.description = patch.description;
    if (patch.price !== undefined) patchDb.price_cents = toCents(patch.price);
    if (patch.category_id !== undefined) patchDb.category_id = patch.category_id;
    if (patch.status !== undefined) patchDb.status = patch.status;
    if (patch.country !== undefined) patchDb.country = patch.country;
    if (patch.region !== undefined) patchDb.region = patch.region;
    if (patch.city !== undefined) patchDb.city = patch.city;
    if (patch.latitude !== undefined) patchDb.latitude = patch.latitude;
    if (patch.longitude !== undefined) patchDb.longitude = patch.longitude;

    const needsGeo =
      (patch.city || patch.region || patch.country) &&
      (patch.latitude === undefined || patch.longitude === undefined);

    if (needsGeo) {
      const current = await supabase
        .from("listings")
        .select("country,region,city")
        .eq("id", numericId)
        .single();
      if (current.error) throw current.error;

      const withCoords = await geocodeIfNeeded({
        country: patchDb.country ?? current.data.country ?? null,
        region: patchDb.region ?? current.data.region ?? null,
        city: patchDb.city ?? current.data.city ?? null,
        latitude: patchDb.latitude ?? null,
        longitude: patchDb.longitude ?? null,
      });

      patchDb.latitude = withCoords.latitude;
      patchDb.longitude = withCoords.longitude;
    }

    const { data, error } = await supabase
      .from("listings")
      .update(patchDb)
      .eq("id", numericId)
      .select("*")
      .single();

    if (error) throw error; // RLS przepuści tylko ownera
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: errorMessage(e) }, { status: 400 });
  }
}

/* ===========================
   DELETE /api/listings/:id
=========================== */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await ctx.params; // 👈 await
    const numericId = Number(id);

    const { error } = await supabase.from("listings").delete().eq("id", numericId).single();

    if (error) throw error; // RLS „owners delete own”
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: errorMessage(e) }, { status: 400 });
  }
}
