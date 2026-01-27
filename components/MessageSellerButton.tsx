"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";

export function MessageSellerButton({
  listingId,
  sellerId,
}: {
  listingId: number;
  sellerId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // ✅ KLUCZ: jeden klient (singleton robi to w lib/supabase-browser.ts)
  const supabase = createBrowserSupabaseClient();

  const onClick = async () => {
    setLoading(true);
    try {
      // (debug – możesz potem usunąć)
      const { data: sessionData } = await supabase.auth.getSession();
      console.log("SESSION:", sessionData.session);

      const { data: userData } = await supabase.auth.getUser();
      console.log("USER:", userData.user);

      const user = userData.user;

      if (!user) {
        router.push(`/auth/sign-in?returnTo=/listings/${listingId}`);
        return;
      }

      if (user.id === sellerId) return; // nie pisz do siebie

      const buyerId = user.id;

      // 1) spróbuj znaleźć istniejący wątek
      const { data: existing, error: findErr } = await supabase
        .from("threads")
        .select("id")
        .eq("listing_id", listingId)
        .eq("buyer", buyerId)
        .eq("seller", sellerId)
        .maybeSingle();

      if (findErr) throw findErr;

      if (existing?.id) {
        router.push(`/messages/${existing.id}`);
        return;
      }

      // 2) jeśli nie ma, utwórz nowy
      const { data: created, error: createErr } = await supabase
        .from("threads")
        .insert({ listing_id: listingId, buyer: buyerId, seller: sellerId })
        .select("id")
        .single();

      if (createErr) throw createErr;

      router.push(`/messages/${created.id}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={onClick} disabled={loading}>
      {loading ? "Otwieram czat..." : "Wyślij wiadomość"}
    </Button>
  );
}
