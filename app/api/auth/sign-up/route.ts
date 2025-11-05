import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { createClient } from "@/lib/supabase-server";

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

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo ?? `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        data: {
          username: profile.username,
          full_name: profile.fullName,
        },
      },
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, userId: data.user?.id });
  } catch (e: unknown) {
    return NextResponse.json({ error: errorMessage(e) }, { status: 400 });
  }
}
