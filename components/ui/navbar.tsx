"use client";

import Link from "next/link";
import Image from "next/image"; // <--- Import Image
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { VOIVODESHIPS } from "@/app/(shared)/consts/voivodeships";
import { User as SupabaseUser } from "@supabase/supabase-js";

export default function Navbar() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const supabase = createBrowserSupabaseClient();
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleSignOut = async () => {
    try {
      const res = await fetch("/api/auth/sign-out", {
        method: "POST",
      });

      if (res.ok) {
        window.location.href = "/";
      }
    } catch (err) {
      console.error("Błąd wylogowywania:", err);
    }
  };

  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const query = formData.get("q")?.toString().trim();
    const city = formData.get("city")?.toString().trim();
    const voivodeship = formData.get("voivodeship")?.toString().trim();

    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (city) params.set("city", city);
    if (voivodeship) params.set("voivodeship", voivodeship);

    router.push(`/listings?${params.toString()}`);
  };

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary">
          <div className="relative h-8 w-8">
            <Image src="/logo.png" alt="EasyBazar Logo" fill className="object-contain" />
          </div>
          <span>EasyBazar</span>
        </Link>

        {/* Wyszukiwarka (środek) */}
        <form
          onSubmit={handleSearch}
          className="hidden md:flex flex-1 max-w-2xl mx-8 gap-2 items-center"
        >
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              name="q"
              type="search"
              placeholder="Czego szukasz?"
              className="pl-9 w-full bg-muted/50"
            />
          </div>
          <Input name="city" placeholder="Miasto" className="w-32 bg-muted/50 hidden lg:block" />
          <select
            name="voivodeship"
            className="h-10 w-40 rounded-md border border-input bg-muted/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hidden xl:block"
          >
            <option value="">Województwo</option>
            {VOIVODESHIPS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <Button type="submit" size="icon" variant="ghost" className="shrink-0">
            <Search className="h-4 w-4" />
          </Button>
        </form>

        {/* Prawa strona: Przyciski */}
        <div className="flex items-center gap-4">
          <Button variant="default" size="sm" className="hidden sm:flex" asChild>
            <Link href="/listings/new">
              <Plus className="mr-2 h-4 w-4" />
              Dodaj ogłoszenie
            </Link>
          </Button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={user.user_metadata?.avatar_url}
                      alt={user.user_metadata?.username}
                    />
                    <AvatarFallback>
                      {user.user_metadata?.username?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user.user_metadata?.username}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">Profil</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/listings/my">Moje ogłoszenia</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Wyloguj się</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/auth/sign-in">Zaloguj</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/auth/sign-up">Zarejestruj</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
