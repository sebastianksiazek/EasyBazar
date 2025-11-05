// src/app/api/auth/sign-up/route.ts
import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { createClient } from "@/lib/supabase-server";

type WithIdentities = { identities?: unknown };

function hasEmptyIdentities(u: WithIdentities | null | undefined): boolean {
  return Array.isArray(u?.identities) && u!.identities.length === 0;
}

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  profile: z.object({
    username: z.string().min(3),
    fullName: z.string().min(1),
  }),
  redirectTo: z.string().url().optional(),
});

function errorMessage(e: unknown) {
  if (e instanceof ZodError) return e.issues.map((i) => i.message).join(", ");
  if (e instanceof Error) return e.message;
  return "Invalid request";
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { email, password, profile, redirectTo } = Body.parse(await req.json());

    // 1) Sprawdź unikalność username (RPC SECURITY DEFINER)
    const { data: isFree, error: rpcError } = await supabase.rpc("is_username_available", {
      p_username: profile.username,
    });
    if (rpcError) {
      return NextResponse.json({ error: rpcError.message }, { status: 400 });
    }
    if (!isFree) {
      return NextResponse.json({ error: "Username already taken" }, { status: 409 });
    }

    // 2) Próba rejestracji
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo ?? `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        data: { username: profile.username, full_name: profile.fullName },
      },
    });

    // 3) mapowanie błędów Supabase -> 409/429/400
    if (error) {
      const msg = error.message.toLowerCase();
      if (
        msg.includes("already registered") ||
        msg.includes("already exists") ||
        msg.includes("duplicate")
      ) {
        return NextResponse.json({ error: "Email already registered" }, { status: 409 });
      }
      if (msg.includes("rate")) {
        return NextResponse.json({ error: "Email rate limit exceeded" }, { status: 429 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // 4) duplikat po stronie danych: identities === []
    if (data?.user && hasEmptyIdentities(data.user as WithIdentities)) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    // 5) brak usera i brak błędu => kolizja
    if (!data?.user) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    // 6) sukces
    return NextResponse.json({ ok: true, userId: data.user.id });
  } catch (e: unknown) {
    return NextResponse.json({ error: errorMessage(e) }, { status: 400 });
  }
}
