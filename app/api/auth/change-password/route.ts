import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { createClient } from "@/lib/supabase-server";

const changePasswordSchema = z.object({
  newPassword: z.string().min(8, "Hasło musi mieć minimum 8 znaków"),
});

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { newPassword } = changePasswordSchema.parse(body);

    const supabase = await createClient();

    // pobieramy aktualnego usera z sesji (cookies -> middleware)
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized – musisz być zalogowany" }, { status: 401 });
    }

    // aktualizacja hasła
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: "Hasło zostało zmienione" });
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.issues[0].message }, { status: 400 });
    }

    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
