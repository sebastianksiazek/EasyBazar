import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const BUCKET = "listing_images"; // <- UPEWNIJ SIĘ, że taki bucket istnieje w Supabase
const MAX_FILES = 10;
const MAX_SIZE_BYTES = 6 * 1024 * 1024; // 6MB

function safeFileExt(filename: string): string {
  const idx = filename.lastIndexOf(".");
  if (idx === -1) return "bin";
  return (
    filename
      .slice(idx + 1)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "") || "bin"
  );
}

export async function POST(req: Request) {
  try {
    // 1) Sprawdź czy user zalogowany (tylko do przypisania ścieżki)
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2) FormData
    const form = await req.formData();
    const files = form.getAll("files");

    if (!files.length) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }
    if (files.length > MAX_FILES) {
      return NextResponse.json({ error: `Max ${MAX_FILES} files` }, { status: 400 });
    }

    // 3) (Opcjonalnie) szybki check czy bucket istnieje
    const { data: buckets, error: bucketsErr } = await supabaseAdmin.storage.listBuckets();
    if (bucketsErr) {
      return NextResponse.json({ error: `Storage error: ${bucketsErr.message}` }, { status: 500 });
    }
    const hasBucket = (buckets ?? []).some((b) => b.name === BUCKET);
    if (!hasBucket) {
      return NextResponse.json(
        {
          error: `Bucket not found: "${BUCKET}". Utwórz go w Supabase Storage albo zmień nazwę w kodzie.`,
        },
        { status: 400 }
      );
    }

    // 4) Upload do storage przez SERVICE ROLE (supabaseAdmin)
    const urls: string[] = [];

    for (const entry of files) {
      if (!(entry instanceof File)) {
        return NextResponse.json({ error: "Invalid file payload" }, { status: 400 });
      }

      if (entry.size > MAX_SIZE_BYTES) {
        return NextResponse.json(
          {
            error: `File "${entry.name}" is too large (max ${Math.round(MAX_SIZE_BYTES / 1024 / 1024)}MB)`,
          },
          { status: 400 }
        );
      }

      const ext = safeFileExt(entry.name);
      const filename = `${crypto.randomUUID()}.${ext}`;
      const path = `${user.id}/${filename}`;

      const bytes = new Uint8Array(await entry.arrayBuffer());

      const { error: uploadError } = await supabaseAdmin.storage.from(BUCKET).upload(path, bytes, {
        contentType: entry.type || "application/octet-stream",
        upsert: false,
      });

      if (uploadError) {
        return NextResponse.json(
          { error: `Upload error: ${uploadError.message}` },
          { status: 400 }
        );
      }

      // Public URL (bucket może być publiczny)
      const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);

      if (!pub?.publicUrl) {
        return NextResponse.json({ error: "Could not create public URL" }, { status: 500 });
      }

      urls.push(pub.publicUrl);
    }

    return NextResponse.json({ urls }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
