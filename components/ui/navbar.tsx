"use client";

import Link from "next/link";
import Image from "next/image"; // <--- Import Image
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Navbar() {
  // Tutaj w przyszłości podepniesz stan logowania
  const user = null; // na razie symulujemy brak zalogowania

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
        <div className="hidden md:flex flex-1 max-w-md mx-8 relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Czego szukasz?"
            className="pl-9 w-full rounded-full bg-muted/50"
          />
        </div>

        {/* Prawa strona: Przyciski */}
        <div className="flex items-center gap-4">
          <Button variant="default" size="sm" className="hidden sm:flex">
            <Plus className="mr-2 h-4 w-4" />
            Dodaj ogłoszenie
          </Button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/avatars/01.png" alt="@user" />
                    <AvatarFallback>US</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">Użytkownik</p>
                    <p className="text-xs leading-none text-muted-foreground">user@example.com</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profil</DropdownMenuItem>
                <DropdownMenuItem>Moje ogłoszenia</DropdownMenuItem>
                <DropdownMenuItem>Ustawienia</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Wyloguj się</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/auth/sign-in">Zaloguj się</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/auth/sign-up">Rejestracja</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
