"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CITIES_BY_VOIVODESHIP,
  VOIVODESHIPS,
  type Voivodeship,
} from "../../(shared)/consts/voivodeships";

/* ================== TYPY ================== */

type Status = "active" | "sold" | "hidden";

type CreateListingRequest = {
  title: string;
  description: string;
  price: number;
  country: string; // kod kraju dla geocode: np. "PL"
  region: string; // województwo
  city: string;
  status?: Status;
  category_id?: number;
  latitude?: number;
  longitude?: number;
  images?: string[];
};

type ApiError = { error?: string };

type GeoResp = { latitude: number; longitude: number };

type UploadResp = { urls: string[] };

/* ================== HELPERY ================== */

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Wystąpił nieoczekiwany błąd.";
}

function clampFiles(files: FileList | null, max = 10): File[] {
  if (!files) return [];
  return Array.from(files).slice(0, max);
}

/* ================== KOMPONENT ================== */

export function NewListingForm() {
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");

  // geo/geocode oczekuje kodu kraju (countrycodes)
  const [country, setCountry] = useState("PL");

  const [region, setRegion] = useState<Voivodeship | "">("");
  const [city, setCity] = useState("");

  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState<Status>("active");

  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const cityOptions = useMemo(() => {
    if (!region) return [];
    return CITIES_BY_VOIVODESHIP[region] ?? [];
  }, [region]);

  const canGeocode = useMemo(() => {
    return country.trim().length >= 2 && region !== "" && city.trim().length >= 1;
  }, [country, region, city]);

  // jak zmienisz województwo, a miasto nie należy do niego -> reset
  function onRegionChange(next: Voivodeship | "") {
    setRegion(next);
    setLatitude("");
    setLongitude("");

    if (!next) {
      setCity("");
      return;
    }

    const allowed = CITIES_BY_VOIVODESHIP[next] ?? [];
    if (!allowed.includes(city)) setCity("");
  }

  /* ================== GEO ================== */

  async function handleGeocode() {
    if (!canGeocode || !region) return;

    setError(null);
    setIsGeocoding(true);

    try {
      const res = await fetch("/api/geo/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country: country.trim(),
          region,
          city: city.trim(),
        }),
      });

      const json: unknown = await res.json().catch(() => ({}));

      if (!res.ok) {
        const apiError = (json as ApiError)?.error;
        setError(apiError ?? "Nie udało się ustalić współrzędnych.");
        return;
      }

      const data = json as GeoResp;
      setLatitude(String(data.latitude));
      setLongitude(String(data.longitude));
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsGeocoding(false);
    }
  }

  /* ================== UPLOAD ================== */

  async function uploadImagesIfAny(): Promise<string[]> {
    if (selectedFiles.length === 0) return [];

    setIsUploading(true);
    try {
      const fd = new FormData();
      for (const file of selectedFiles) fd.append("files", file);

      const res = await fetch("/api/uploads/listing_images", {
        method: "POST",
        body: fd,
      });

      const json: unknown = await res.json().catch(() => ({}));

      if (!res.ok) {
        const apiError = (json as ApiError)?.error;
        throw new Error(apiError ?? "Upload zdjęć nie powiódł się.");
      }

      const data = json as UploadResp;
      return Array.isArray(data.urls) ? data.urls : [];
    } finally {
      setIsUploading(false);
    }
  }

  /* ================== SUBMIT ================== */

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (!region) {
        setError("Wybierz województwo.");
        return;
      }

      const priceNumber = Number(price);
      if (!Number.isFinite(priceNumber) || priceNumber <= 0) {
        setError("Cena musi być poprawną liczbą większą od 0.");
        return;
      }

      // 1) upload obrazów
      const uploadedUrls = await uploadImagesIfAny();

      // 2) listing
      const body: CreateListingRequest = {
        title: title.trim(),
        description: description.trim(),
        price: priceNumber,
        country: country.trim(),
        region,
        city: city.trim(),
        status,
      };

      if (categoryId.trim()) body.category_id = Number(categoryId);
      if (latitude.trim()) body.latitude = Number(latitude);
      if (longitude.trim()) body.longitude = Number(longitude);
      if (uploadedUrls.length > 0) body.images = uploadedUrls;

      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json: unknown = await res.json().catch(() => ({}));

      if (!res.ok) {
        const apiError = (json as ApiError)?.error;
        setError(apiError ?? "Nie udało się dodać ogłoszenia.");
        return;
      }

      router.push("/listings");
      router.refresh();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  /* ================== JSX ================== */

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error && (
        <div className="border rounded-md p-3 text-sm bg-muted/20 text-red-600">{error}</div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">Tytuł</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="np. Tokarka CNC, Rower górski, iPhone 13"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Opis</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full min-h-[160px] rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="Opisz stan, parametry, odbiór, wysyłkę..."
          required
        />
        <p className="text-xs text-muted-foreground">Min. 10 znaków, max. 5000.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Cena (PLN)</label>
          <Input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="decimal"
            placeholder="np. 199.99"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Status)}
            className="w-full h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="active">Aktywne</option>
            <option value="sold">Sprzedane</option>
            <option value="hidden">Ukryte</option>
          </select>
        </div>
      </div>

      {/* LOKALIZACJA - dropdowny */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Kraj (kod, np. PL)</label>
          <Input
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="PL"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Województwo</label>
          <select
            value={region}
            onChange={(e) => onRegionChange((e.target.value || "") as Voivodeship | "")}
            className="w-full h-10 rounded-md border bg-background px-3 text-sm"
            required
          >
            <option value="">Wybierz województwo...</option>
            {VOIVODESHIPS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Miasto</label>
          <select
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              setLatitude("");
              setLongitude("");
            }}
            className="w-full h-10 rounded-md border bg-background px-3 text-sm"
            required
            disabled={!region}
          >
            <option value="">
              {region ? "Wybierz miasto..." : "Najpierw wybierz województwo"}
            </option>
            {cityOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* GEO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div className="space-y-2">
          <label className="text-sm font-medium">Latitude</label>
          <Input
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            inputMode="decimal"
            placeholder="np. 53.4289"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Longitude</label>
          <Input
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            inputMode="decimal"
            placeholder="np. 14.5530"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleGeocode}
          disabled={!canGeocode || isGeocoding}
          className="w-full"
        >
          {isGeocoding ? "Ustalanie..." : "Ustal współrzędne"}
        </Button>
      </div>

      {/* DODATKOWE + UPLOAD */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Zdjęcia (max 10)</label>
          <Input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setSelectedFiles(clampFiles(e.target.files, 10))}
          />
          <p className="text-xs text-muted-foreground">Wybrano: {selectedFiles.length} plik(ów)</p>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting || isUploading}>
          {isSubmitting
            ? "Dodawanie..."
            : isUploading
              ? "Wysyłanie zdjęć..."
              : "Opublikuj ogłoszenie"}
        </Button>

        <Button type="button" variant="outline" onClick={() => router.push("/listings")}>
          Anuluj
        </Button>
      </div>
    </form>
  );
}
