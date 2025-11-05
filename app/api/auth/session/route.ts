import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ session: data.session });
  } catch (e) {
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
