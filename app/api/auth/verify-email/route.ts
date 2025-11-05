import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { createClient } from "@/lib/supabase-server";

const Body = z.object({
  email: z.string().email(),
  token: z.string().trim().min(6).max(12),
});

function errorMessage(e: unknown) {
  if (e instanceof ZodError) return e.issues.map((i) => i.message).join(", ");
  if (e instanceof Error) return e.message;
  return "Invalid request";
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { email, token } = Body.parse(await req.json());

    // 1) Spróbuj typ "email" (częsty dla OTP z maila)
    let { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });

    // 2) Fallback do "signup" (niektóre konfiguracje używają tego typu)
    if (error) {
      ({ data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "signup",
      }));
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Po sukcesie konto jest confirmed; @supabase/ssr może ustawić sesję w cookie
    return NextResponse.json({ ok: true, user: data.user });
  } catch (e: unknown) {
    return NextResponse.json({ error: errorMessage(e) }, { status: 400 });
  }
}
