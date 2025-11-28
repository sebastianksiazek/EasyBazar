// app/api/user/[id]/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";

type RouteCtx = { params: Promise<{ id: string }> };

type PublicProfile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
};

const IdSchema = z.string().uuid();

/* ===========================
   GET /api/user/:id
   - publiczny profil użytkownika
   - TYLKO wybrane pola
=========================== */
export async function GET(_req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const userId = IdSchema.parse(id); // walidacja UUID

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, username, full_name, avatar_url, created_at")
      .eq("id", userId)
      .single();

    if (error || !data) {
      // jeśli rekord nie istnieje albo inny błąd SQL
      return NextResponse.json({ error: "Użytkownik nie istnieje" }, { status: 404 });
    }

    const profile = data as PublicProfile;

    return NextResponse.json(profile);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Nieprawidłowe ID użytkownika" }, { status: 400 });
    }

    console.error(e);
    return NextResponse.json({ error: "Nieoczekiwany błąd" }, { status: 500 });
  }
}
