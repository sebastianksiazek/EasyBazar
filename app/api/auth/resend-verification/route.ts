import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { createClient } from "@/lib/supabase-server";

const Body = z.object({
  email: z.string().email(),
  // opcjonalnie możesz wystawić typ; domyślnie "signup" dla weryfikacji konta
  type: z.enum(["signup", "email_change"]).default("signup"),
});

function errorMessage(e: unknown) {
  if (e instanceof ZodError) return e.issues.map((i) => i.message).join(", ");
  if (e instanceof Error) return e.message;
  return "Invalid request";
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { email, type } = Body.parse(await req.json());

    const { error } = await supabase.auth.resend({ type, email });

    if (error) {
      // np. user nie istnieje, e-mail już potwierdzony, limity wysyłek itp.
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: errorMessage(e) }, { status: 400 });
  }
}
