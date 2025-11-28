// app/api/listings/route.ts
import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

/* ========== Typy zgodne z tabelą ========== */
type ListingStatus = "active" | "sold" | "hidden";

type ListingRow = {
  id: number;
  owner: string;
  title: string;
  description: string;
  price_cents: number;
  category_id: number | null;
  status: ListingStatus | null;
  created_at: string;
  city: string | null;
  region: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
};

type ListingInsertDb = Omit<ListingRow, "id" | "created_at">;

type ListingImageRow = {
  path: string;
};

type ListingWithImages = ListingRow & {
  listing_images?: ListingImageRow[] | null;
};

type BaseLoc = {
  country: string | null;
  region: string | null;
  city: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type SellerProfile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

/* ========== Helpery ========== */
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

/* ========== Zod schemat ========== */
const ListingCreateSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(5000),
  price: z.number().positive(),
  category_id: z.coerce.number().int().optional(),
  status: z.enum(["active", "sold", "hidden"]).optional(),
  country: z.string().min(2),
  region: z.string().min(2),
  city: z.string().min(1),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  images: z.array(z.string().min(1)).max(10).optional(),
});

const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  q: z.string().trim().optional(),
  country: z.string().optional(),
  region: z.string().optional(),
  city: z.string().optional(),
  owner: z.enum(["me"]).optional(),
});

/* ========== GET /api/listings ========== */
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
      .select("*, listing_images(path)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((qp.page - 1) * qp.limit, qp.page * qp.limit - 1);

    if (qp.q) query = query.or(`title.ilike.%${qp.q}%,description.ilike.%${qp.q}%`);
    if (qp.country) query = query.eq("country", qp.country);
    if (qp.region) query = query.eq("region", qp.region);
    if (qp.city) query = query.eq("city", qp.city);
    if (qp.owner === "me" && user) query = query.eq("owner", user.id);

    const { data, error, count } = await query;
    if (error) throw error;

    const rows = (data as ListingWithImages[]) ?? [];

    /* ====== SELLER FETCH (supabaseAdmin, omija RLS) ====== */

    const ownerIds = Array.from(
      new Set(rows.map((row) => row.owner).filter((id): id is string => Boolean(id)))
    );

    let sellerById = new Map<string, SellerProfile>();

    if (ownerIds.length > 0) {
      const { data: sellers } = await supabaseAdmin
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", ownerIds as string[]);

      if (sellers) {
        const typedSellers = sellers as SellerProfile[];
        sellerById = new Map(
          typedSellers.map((s) => [
            s.id,
            {
              id: s.id,
              username: s.username,
              avatar_url: s.avatar_url,
            },
          ])
        );
      }
    }

    /* ====== BUILD FINAL ITEMS ====== */

    const items = rows.map((row) => {
      const images = row.listing_images?.map((img: ListingImageRow) => img.path) ?? [];
      const { listing_images: _ignored, ...rest } = row;

      const seller = sellerById.get(row.owner) ?? null;

      return {
        ...rest,
        images,
        seller,
      };
    });

    return NextResponse.json({
      page: qp.page,
      limit: qp.limit,
      total: count ?? 0,
      items,
    });
  } catch (e) {
    return NextResponse.json({ error: errorMessage(e) }, { status: 400 });
  }
}

/* ========== POST /api/listings ========== */
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
      latitude: parsed.latitude ?? null,
      longitude: parsed.longitude ?? null,
    };

    listingForDb = await geocodeIfNeeded<Omit<ListingInsertDb, "owner">>(listingForDb);

    const insertPayload: ListingInsertDb = {
      ...listingForDb,
      owner: user.id,
    };

    const { data, error } = await supabase
      .from("listings")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error) throw error;

    // Insert images if provided
    if (parsed.images && parsed.images.length > 0) {
      const rows = parsed.images.map((path) => ({
        listing_id: data.id,
        path,
      }));

      const { error: imgError } = await supabase.from("listing_images").insert(rows);

      if (imgError) throw imgError;
    }

    return NextResponse.json(
      {
        ...data,
        images: parsed.images ?? [],
      },
      { status: 201 }
    );
  } catch (e) {
    return NextResponse.json({ error: errorMessage(e) }, { status: 400 });
  }
}
