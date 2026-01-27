import { NextResponse, type NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { createServerClient } from "@supabase/ssr";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

function errorMessage(e: unknown) {
  if (e instanceof ZodError) return e.issues.map((i) => i.message).join(", ");
  if (e instanceof Error) return e.message;
  return "Invalid request";
}

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true });

  try {
    const { email, password } = Body.parse(await request.json());

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // ZWRACAMY RESPONSE, który ma Set-Cookie
    return NextResponse.json(
      { ok: true, user: data.user },
      {
        headers: response.headers, // <- kluczowe
      }
    );
  } catch (e: unknown) {
    return NextResponse.json({ error: errorMessage(e) }, { status: 400 });
  }
}
