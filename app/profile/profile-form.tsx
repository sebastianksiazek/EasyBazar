"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

const profileSchema = z.object({
  username: z
    .string()
    .min(3, "Nazwa użytkownika musi mieć min. 3 znaki")
    .max(20, "Maksymalnie 20 znaków"),
  full_name: z.string().optional(),
  email: z.string().email("Niepoprawny adres email"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

export default function ProfileForm({ profile, email }: { profile: Profile; email?: string }) {
  const supabase = createBrowserSupabaseClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: profile?.username || "",
      full_name: profile?.full_name || "",
      email: email || "",
    },
  });

  async function onSubmit(data: ProfileFormValues) {
    setLoading(true);
    setMessage(null);

    try {
      // 1. Aktualizacja tabeli profiles
      const { error } = await supabase
        .from("profiles")
        .update({
          username: data.username,
          full_name: data.full_name,
        })
        .eq("id", profile.id);

      if (error) throw error;

      // 2. Aktualizacja metadanych auth (dla spójności sesji)
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          username: data.username,
          full_name: data.full_name,
        },
      });

      if (authError) {
        console.error("Error updating auth metadata:", authError);
      }

      // 3. Aktualizacja emaila (jeśli zmieniony)
      if (data.email !== email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: data.email,
        });
        if (emailError) throw emailError;
        setMessage({
          type: "success",
          text: "Profil zaktualizowany. Sprawdź skrzynkę email, aby potwierdzić zmianę adresu.",
        });
      } else {
        setMessage({ type: "success", text: "Profil został zaktualizowany" });
      }

      router.refresh();
    } catch (error) {
      const err = error as Error;
      setMessage({ type: "error", text: err.message || "Wystąpił błąd" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Twój Profil</CardTitle>
        <CardDescription>Zarządzaj swoimi danymi publicznymi.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Sekcja Awatara (Tylko wyświetlanie, brak backendu do uploadu w tej chwili) */}
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback>
                {profile?.username?.slice(0, 2).toUpperCase() || "EB"}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col justify-center">
              <p className="text-sm font-medium">Twój awatar</p>
              <p className="text-xs text-muted-foreground">Pobierany z Twojego profilu.</p>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium">
              Nazwa użytkownika
            </label>
            <Input id="username" {...form.register("username")} />
            {form.formState.errors.username && (
              <p className="text-sm text-red-500">{form.formState.errors.username.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="full_name" className="text-sm font-medium">
              Pełne imię i nazwisko
            </label>
            <Input id="full_name" {...form.register("full_name")} />
            {form.formState.errors.full_name && (
              <p className="text-sm text-red-500">{form.formState.errors.full_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Adres Email
            </label>
            <Input id="email" {...form.register("email")} />
            {form.formState.errors.email && (
              <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Zmiana adresu email wymaga potwierdzenia.
            </p>
          </div>

          {message && (
            <div
              className={`p-3 rounded-md text-sm ${message.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
            >
              {message.text}
            </div>
          )}

          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Zapisywanie..." : "Zapisz zmiany"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
