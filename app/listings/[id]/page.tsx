// app/listings/[id]/page.tsx
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type Seller = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

type Listing = {
  id: number;
  title: string;
  description: string;
  price_cents: number;
  status: "active" | "sold" | "hidden" | null;
  city: string | null;
  region: string | null;
  country: string | null;
  created_at: string;
  images: string[];
  seller: Seller | null;
};

async function fetchListing(id: string): Promise<Listing | null> {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (typeof window === "undefined"
      ? process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000"
      : "");

  const res = await fetch(`${baseUrl}/api/listings/${id}`, {
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    return null;
  }

  const data = (await res.json()) as Listing;
  return data;
}

export default async function ListingPage({ params }: { params: { id: string } }) {
  const listing = await fetchListing(params.id);

  if (!listing) {
    notFound(); // wywoła app/not-found.tsx jeżeli istnieje
  }

  const price = listing.price_cents / 100;
  const locationParts = [listing.city, listing.region, listing.country].filter(Boolean);
  const location = locationParts.join(", ");

  return (
    <div className="container mx-auto px-4 py-8 min-h-[calc(100vh-4rem)]">
      <Button variant="ghost" asChild className="mb-4">
        <Link href="/listings">← Wróć do ogłoszeń</Link>
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Galeria zdjęć */}
        <div className="space-y-4">
          {listing.images?.[0] ? (
            <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted">
              <Image src={listing.images[0]} alt={listing.title} fill className="object-cover" />
            </div>
          ) : (
            <div className="w-full aspect-video rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
              Brak zdjęcia
            </div>
          )}

          {listing.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {listing.images.slice(1).map((img, idx) => (
                <div
                  key={idx}
                  className="relative aspect-square rounded-md overflow-hidden bg-muted"
                >
                  <Image
                    src={img}
                    alt={`${listing.title} miniatura ${idx + 1}`}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Szczegóły ogłoszenia */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{listing.title}</h1>
            <p className="text-2xl font-semibold text-primary">
              {price.toLocaleString("pl-PL", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              zł
            </p>
            {listing.status !== "active" && (
              <span className="inline-block mt-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
                {listing.status === "sold" ? "Sprzedane" : "Ukryte"}
              </span>
            )}
          </div>

          <div className="text-sm text-muted-foreground space-y-1">
            {location && <p>Lokalizacja: {location}</p>}
            <p>
              Dodano:{" "}
              {new Date(listing.created_at).toLocaleString("pl-PL", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Opis</h2>
            <p className="whitespace-pre-line">{listing.description}</p>
          </div>

          {listing.seller && (
            <div className="border rounded-lg p-4 flex items-center gap-3">
              {listing.seller.avatar_url && (
                <div className="relative h-12 w-12 rounded-full overflow-hidden bg-muted">
                  <Image
                    src={listing.seller.avatar_url}
                    alt={listing.seller.username ?? "Sprzedawca"}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div>
                <p className="font-medium">{listing.seller.username ?? "Użytkownik"}</p>
                <p className="text-xs text-muted-foreground">Sprzedawca z EasyBazar</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
