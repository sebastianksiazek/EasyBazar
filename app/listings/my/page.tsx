import { createClient } from "@/lib/supabase-server";
import { ListingCard } from "@/components/ListingCard";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PlusCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MyListingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  const { data: listings } = await supabase
    .from("listings")
    .select(
      `
      *,
      listing_images (path),
      categories (name)
    `
    )
    .eq("owner", user.id)
    .order("created_at", { ascending: false });

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
            const firstImage = listing.listing_images?.[0]?.path || null;
            const categoryName = listing.categories?.name || "Inne";

            return (
              <div key={listing.id} className="relative group">
                <ListingCard
                  id={listing.id}
                  title={listing.title}
                  price={listing.price_cents / 100}
                  imageSrc={firstImage}
                  location={listing.city || "Polska"}
                  category={categoryName}
                />
                {/* Overlay z akcjami (opcjonalnie) */}
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Tu można dodać przyciski edycji/usuwania w przyszłości */}
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
