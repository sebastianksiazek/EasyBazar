import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ListingCard } from "@/components/ListingCard";

export const dynamic = "force-dynamic";

async function fetchListings() {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (typeof window === "undefined"
      ? process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000"
      : "");

  const res = await fetch(`${baseUrl}/api/listings?page=1&limit=8`, {
    next: { revalidate: 0 }, // pobiera świeże dane przy każdym żądaniu serwera
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
  }>;
}

export default async function Home() {
  const listings = await fetchListings();

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Hero Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/40">
        <div className="container px-4 md:px-6 mx-auto text-center">
          <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
            Kupuj i sprzedawaj lokalnie
          </h1>
          <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400 mt-4">
            Najlepsze okazje w Twojej okolicy. Dołącz do społeczności EasyBazar już dziś.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/listings">Przeglądaj oferty</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/listings/new">Wystaw przedmiot</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Sekcja z ogłoszeniami */}
      <section className="container px-4 py-12 mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Najnowsze ogłoszenia</h2>
          <Link href="/listings" className="text-primary hover:underline">
            Zobacz wszystkie
          </Link>
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
                  category={"Inne"} // Możesz tu zastąpić kategorią, jeśli endpoint ją zwróci
                />
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 border rounded-lg bg-muted/10">
            <h3 className="text-xl font-semibold mb-2">Brak ogłoszeń</h3>
            <p className="text-muted-foreground mb-4">Bądź pierwszy i wystaw coś na sprzedaż!</p>
            <Button asChild>
              <Link href="/listings/new">Dodaj ogłoszenie</Link>
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
