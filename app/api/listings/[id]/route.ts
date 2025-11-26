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

type ListingImageRow = {
  path: string;
};

type ListingWithImages = ListingRow & {
  listing_images?: ListingImageRow[] | null;
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

    // ścieżki zdjęć z Supabase Storage
    images: z.array(z.string().min(1)).max(10).optional(),
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

    const { id } = await ctx.params;
    const numericId = Number(id);

    const { data, error } = await supabase
      .from("listings")
      .select("*, listing_images(path)")
      .eq("id", numericId)
      .single();

    if (error) throw error;

    const listing = data as ListingWithImages;

    const images = listing.listing_images?.map((img: ListingImageRow) => img.path) ?? [];

    const { listing_images: _ignored, ...rest } = listing;

    return NextResponse.json({ ...rest, images });
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

    const { id } = await ctx.params;
    const numericId = Number(id);

    const patch: ListingUpdate = ListingUpdateSchema.parse(await req.json());

    // wydzielamy images, reszta idzie do patchDb
    const { images, ...rest } = patch;

    const patchDb: ListingUpdateDb = {};
    if (rest.title !== undefined) patchDb.title = rest.title;
    if (rest.description !== undefined) patchDb.description = rest.description;
    if (rest.price !== undefined) patchDb.price_cents = toCents(rest.price);
    if (rest.category_id !== undefined) patchDb.category_id = rest.category_id;
    if (rest.status !== undefined) patchDb.status = rest.status;
    if (rest.country !== undefined) patchDb.country = rest.country;
    if (rest.region !== undefined) patchDb.region = rest.region;
    if (rest.city !== undefined) patchDb.city = rest.city;
    if (rest.latitude !== undefined) patchDb.latitude = rest.latitude;
    if (rest.longitude !== undefined) patchDb.longitude = rest.longitude;

    const hasListingFields = Object.keys(patchDb).length > 0;

    if (hasListingFields) {
      const needsGeo =
        (rest.city || rest.region || rest.country) &&
        (rest.latitude === undefined || rest.longitude === undefined);

      if (needsGeo) {
        const current = await supabase
          .from("listings")
          .select("country,region,city")
          .eq("id", numericId)
          .single();

        if (current.error) throw current.error;

        const currentLoc = current.data as Pick<ListingRow, "country" | "region" | "city">;

        const withCoords = await geocodeIfNeeded({
          country: patchDb.country ?? currentLoc.country ?? null,
          region: patchDb.region ?? currentLoc.region ?? null,
          city: patchDb.city ?? currentLoc.city ?? null,
          latitude: patchDb.latitude ?? null,
          longitude: patchDb.longitude ?? null,
        });

        patchDb.latitude = withCoords.latitude;
        patchDb.longitude = withCoords.longitude;
      }

      const { error: updateError } = await supabase
        .from("listings")
        .update(patchDb)
        .eq("id", numericId)
        .single();

      if (updateError) throw updateError; // RLS przepuści tylko ownera
    }

    // aktualizacja zdjęć – jeżeli images zostało przekazane
    if (images !== undefined) {
      // skasuj stare
      const { error: delError } = await supabase
        .from("listing_images")
        .delete()
        .eq("listing_id", numericId);

      if (delError) throw delError;

      if (images.length > 0) {
        const rows = images.map((path) => ({
          listing_id: numericId,
          path,
        }));

        const { error: imgError } = await supabase.from("listing_images").insert(rows);

        if (imgError) throw imgError;
      }
    }

    // Na koniec zwracamy aktualny stan listing + images (tak samo jak w GET)
    const { data: full, error: fullError } = await supabase
      .from("listings")
      .select("*, listing_images(path)")
      .eq("id", numericId)
      .single();

    if (fullError) throw fullError;

    const fullListing = full as ListingWithImages;

    const imagesOut = fullListing.listing_images?.map((img: ListingImageRow) => img.path) ?? [];

    const { listing_images: _ignored2, ...restListing } = fullListing;

    return NextResponse.json({ ...restListing, images: imagesOut });
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

    const { id } = await ctx.params;
    const numericId = Number(id);

    const { error } = await supabase.from("listings").delete().eq("id", numericId).single();

    if (error) throw error; // RLS „owners delete own”; listing_images usuwa ON DELETE CASCADE
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: errorMessage(e) }, { status: 400 });
  }
}
