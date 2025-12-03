import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { createClient } from "@/lib/supabase-server";

const changeEmailSchema = z.object({
  newEmail: z.string().email("Podaj poprawny adres email"),
});

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { newEmail } = changeEmailSchema.parse(body);

    const supabase = await createClient();

    // sprawdzamy czy user jest zalogowany
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized – musisz być zalogowany" }, { status: 401 });
    }

    // aktualizacja emaila
    const { error } = await supabase.auth.updateUser({
      email: newEmail,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      message: "Email został zmieniony. Sprawdź skrzynkę i potwierdź nowy adres.",
    });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.issues[0].message }, { status: 400 });
    }

    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
