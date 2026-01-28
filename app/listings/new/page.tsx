import Link from "next/link";
import { Button } from "@/components/ui/button";
import { NewListingForm } from "./NewListingForm";

export const dynamic = "force-dynamic";

export default function NewListingPage() {
  return (
    <div className="container mx-auto px-4 py-8 min-h-[calc(100vh-4rem)]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dodaj ogłoszenie</h1>
          <p className="text-muted-foreground mt-1">Uzupełnij dane i opublikuj nowe ogłoszenie</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/listings">Wróć do ogłoszeń</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 border rounded-lg p-6 bg-background">
          <NewListingForm />
        </div>

        <div className="border rounded-lg p-6 bg-muted/10 space-y-4">
          <h2 className="text-lg font-semibold">Wskazówki</h2>
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-2">
            <li>Tytuł min. 3 znaki, opis min. 10 znaków.</li>
            <li>
              Dodaj region (województwo) i miasto — geokodowanie uzupełni współrzędne, jeśli nie
              podasz.
            </li>
            <li>Możesz wkleić do 10 linków do zdjęć (po jednym w linii).</li>
          </ul>

          <Button variant="outline" asChild className="w-full">
            <Link href="/listings">Zobacz ogłoszenia</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
