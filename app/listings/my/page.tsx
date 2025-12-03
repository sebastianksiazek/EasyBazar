import { createClient } from "@/lib/supabase-server";
import { ListingCard } from "@/components/ListingCard";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { headers as nextHeaders } from "next/headers";

export const dynamic = "force-dynamic";

async function fetchMyListings() {
  // Sprawdzenie, czy użytkownik jest zalogowany
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (typeof window === "undefined"
      ? process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000"
      : "");

  // Pobieramy cookie z bieżącego requestu i przekazujemy je dalej
  const h = await nextHeaders();
  const cookie = h.get("cookie") ?? "";

  const res = await fetch(`${baseUrl}/api/listings?owner=me&page=1&limit=50`, {
    next: { revalidate: 0 },
    headers: {
      cookie, // wystarczy, żeby Supabase w endpointzie zobaczył sesję
    },
    credentials: "include",
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Unauthorized");
    }
    throw new Error("Failed to fetch listings");
  }

  const json = await res.json();
  return json.items as Array<{
    id: number;
    title: string;
    price_cents: number;
    city: string | null;
    images: string[];
    status: string;
  }>;
}

export default async function MyListingsPage() {
  const listings = await fetchMyListings();

  return (
    <div className="container mx-auto px-4 py-8 min-h-[calc(100vh-4rem)]">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Moje ogłoszenia</h1>
          <p className="text-muted-foreground mt-1">Zarządzaj swoimi ofertami sprzedaży</p>
        </div>
        <Button asChild>
          <Link href="/listings/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Dodaj nowe
          </Link>
        </Button>
      </div>

      {listings && listings.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {listings.map((listing) => {
            const firstImage = listing.images?.[0] ?? null;

            return (
              <div key={listing.id} className="relative group">
                <ListingCard
                  id={listing.id}
                  title={listing.title}
                  price={listing.price_cents / 100}
                  imageSrc={firstImage}
                  location={listing.city || "Polska"}
                  category={"Inne"}
                />
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* miejsce na przyciski edycji/usuwania */}
                </div>
                {listing.status !== "active" && (
                  <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 text-xs rounded">
                    {listing.status === "sold" ? "Sprzedane" : "Ukryte"}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 border rounded-lg bg-muted/10">
          <h3 className="text-xl font-semibold mb-2">Nie masz jeszcze żadnych ogłoszeń</h3>
          <p className="text-muted-foreground mb-6">
            Zacznij sprzedawać niepotrzebne rzeczy już dziś!
          </p>
          <Button asChild>
            <Link href="/listings/new">Dodaj pierwsze ogłoszenie</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
