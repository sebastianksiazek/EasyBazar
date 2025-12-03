import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function DELETE(_req: Request) {
  try {
    // 1. Zwykły klient na podstawie cookies -> żeby sprawdzić kto jest zalogowany
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized – musisz być zalogowany" }, { status: 401 });
    }

    // 2. Admin client z service role key -> może usuwać użytkowników
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    // (opcjonalnie) możesz tu wyczyścić session cookie itd.
    // ale po usunięciu usera sesja i tak przestanie być ważna

    return NextResponse.json({
      message: "Konto zostało usunięte",
    });
  } catch (e) {
    console.error("DELETE /api/auth/delete-account error", e);

    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
