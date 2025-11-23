import { createClient } from "@/lib/supabase-server";
import { ListingCard } from "@/components/ListingCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Search } from "lucide-react";

export const dynamic = "force-dynamic";

interface ListingsPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    minPrice?: string;
    maxPrice?: string;
  }>;
}

export default async function ListingsPage({ searchParams }: ListingsPageProps) {
  const supabase = await createClient();
  const params = await searchParams;
  const query = params.q || "";

  let dbQuery = supabase
    .from("listings")
    .select(
      `
      *,
      listing_images (path),
      categories (name)
    `
    )
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (query) {
    dbQuery = dbQuery.ilike("title", `%${query}%`);
  }

  const { data: listings } = await dbQuery;

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
              defaultValue={query}
            />
          </div>
          <Button type="submit">Szukaj</Button>
        </form>
      </div>

      {listings && listings.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {listings.map((listing) => {
            const firstImage = listing.listing_images?.[0]?.path || null;
            const categoryName = listing.categories?.name || "Inne";

            return (
              <ListingCard
                key={listing.id}
                id={listing.id}
                title={listing.title}
                price={listing.price_cents / 100}
                imageSrc={firstImage}
                location={listing.city || "Polska"}
                category={categoryName}
              />
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 border rounded-lg bg-muted/10">
          <h3 className="text-xl font-semibold mb-2">Nie znaleziono ogłoszeń</h3>
          <p className="text-muted-foreground mb-6">
            {query
              ? `Brak wyników dla frazy "${query}". Spróbuj innego zapytania.`
              : "Aktualnie nie ma żadnych aktywnych ogłoszeń."}
          </p>
          <div className="flex justify-center gap-4">
            {query && (
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
