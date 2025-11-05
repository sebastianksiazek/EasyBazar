import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { createClient } from "@/lib/supabase-server";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

function errorMessage(e: unknown) {
  if (e instanceof ZodError) return e.issues.map((i) => i.message).join(", ");
  if (e instanceof Error) return e.message;
  return "Invalid request";
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { email, password } = Body.parse(await req.json());

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      // Najczęstsze: niepoprawne dane lub niepotwierdzony e-mail.
      // Przekazujemy jasny komunikat do UI.
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Sesja httpOnly jest ustawiona przez @supabase/ssr w cookie.
    return NextResponse.json({ ok: true, user: data.user });
  } catch (e: unknown) {
    return NextResponse.json({ error: errorMessage(e) }, { status: 400 });
  }
}
