import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Search } from "lucide-react";
import { ListingCard } from "@/components/ListingCard";

export const dynamic = "force-dynamic";

interface SearchParams {
  q?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  city?: string;
  voivodeship?: string;
}

async function fetchListings(params: SearchParams) {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (typeof window === "undefined"
      ? process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000"
      : "");

  const queryParams = new URLSearchParams();

  if (params.q) queryParams.append("q", params.q);
  if (params.city) queryParams.append("city", params.city);
  if (params.voivodeship) queryParams.append("region", params.voivodeship);
  queryParams.append("page", "1");
  queryParams.append("limit", "50");

  const res = await fetch(`${baseUrl}/api/listings?${queryParams.toString()}`, {
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch listings");
  }

  const json = await res.json();
  return json.items as Array<{
    id: number;
    title: string;
    price_cents: number;
    city: string | null;
    images: string[];
    seller?: {
      username: string | null;
      avatar_url: string | null;
    } | null;
  }>;
}

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const listings = await fetchListings(params);

  return (
    <div className="container mx-auto px-4 py-8 min-h-[calc(100vh-4rem)]">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Wszystkie ogłoszenia</h1>
          <p className="text-muted-foreground mt-1">Przeglądaj najlepsze okazje w Twojej okolicy</p>
        </div>

        <form className="flex w-full md:w-auto gap-2" action="/listings">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              name="q"
              placeholder="Szukaj po tytule..."
              className="pl-8"
              defaultValue={params.q || ""}
            />
          </div>
          <Button type="submit">Szukaj</Button>
        </form>
      </div>

      {listings && listings.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {listings.map((listing) => {
            const firstImage = listing.images?.[0] ?? null;

            return (
              <ListingCard
                key={listing.id}
                id={listing.id}
                title={listing.title}
                price={listing.price_cents / 100}
                imageSrc={firstImage}
                location={listing.city || "Polska"}
                category={"Inne"} // Endpoint nie zwraca kategorii, możesz to zmienić w API
              />
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 border rounded-lg bg-muted/10">
          <h3 className="text-xl font-semibold mb-2">Nie znaleziono ogłoszeń</h3>
          <p className="text-muted-foreground mb-6">
            {params.q
              ? `Brak wyników dla frazy "${params.q}". Spróbuj innego zapytania.`
              : "Aktualnie nie ma żadnych aktywnych ogłoszeń."}
          </p>
          <div className="flex justify-center gap-4">
            {params.q && (
              <Button variant="outline" asChild>
                <Link href="/listings">Wyczyść filtry</Link>
              </Button>
            )}
            <Button asChild>
              <Link href="/listings/new">Dodaj ogłoszenie</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
