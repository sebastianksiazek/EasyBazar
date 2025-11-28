// app/api/user/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase-server";

const updateProfileSchema = z.object({
  username: z.string().min(3).max(50).optional(),
  full_name: z.string().min(1).max(100).optional(),
  avatar_url: z.string().url().nullable().optional(),
});

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Nie jesteś zalogowany" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url, created_at")
      .eq("id", user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ error: "Nie udało się pobrać profilu" }, { status: 500 });
    }

    return NextResponse.json({
      user: { id: user.id, email: user.email },
      profile,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Nieoczekiwany błąd" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Nie jesteś zalogowany" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Nieprawidłowe dane", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from("profiles")
      .update(parsed.data)
      .eq("id", user.id)
      .select("id, username, full_name, avatar_url, created_at")
      .single();

    if (updateError) {
      return NextResponse.json({ error: "Nie udało się zaktualizować profilu" }, { status: 500 });
    }

    return NextResponse.json({
      user: { id: user.id, email: user.email },
      profile: updated,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Nieoczekiwany błąd" }, { status: 500 });
  }
}
