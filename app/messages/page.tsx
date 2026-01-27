import Link from "next/link";
import { createClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div className="container mx-auto px-4 py-8">Zaloguj się, aby zobaczyć wiadomości.</div>;
  }

  const { data: threads } = await supabase
    .from("threads")
    .select("id,listing_id,buyer,seller,created_at")
    .or(`buyer.eq.${user.id},seller.eq.${user.id}`)
    .order("created_at", { ascending: false });

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-4">Wiadomości</h1>

      <div className="space-y-2">
        {(threads ?? []).map((t) => {
          const other = t.buyer === user.id ? t.seller : t.buyer;
          return (
            <Link
              key={t.id}
              href={`/messages/${t.id}`}
              className="block border rounded-lg p-3 hover:bg-muted/30"
            >
              <div className="font-medium">Wątek #{t.id}</div>
              <div className="text-xs text-muted-foreground">
                Rozmówca: {other.slice(0, 8)}… • Ogłoszenie: {t.listing_id}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
