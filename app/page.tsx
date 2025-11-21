import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
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

      {/* Sekcja z ogłoszeniami (Placeholder) */}
      <section className="container px-4 py-12 mx-auto">
        <h2 className="text-2xl font-bold mb-6">Najnowsze ogłoszenia</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {/* Tutaj w przyszłości zmapujesz listę ogłoszeń */}
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="border rounded-lg p-4 h-64 flex items-center justify-center bg-card text-card-foreground shadow-sm"
            >
              Ogłoszenie {i}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
