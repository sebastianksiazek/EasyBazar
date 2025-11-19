// app/auth/callback/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AuthCallbackPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("Potwierdzam konto...");

  useEffect(() => {
    setTimeout(() => {
      const error = sp.get("error") || sp.get("error_description");

      if (error) {
        setStatus("error");
        setMessage("Nie udało się potwierdzić konta. Link mógł wygasnąć lub został już użyty.");
        return;
      }

      // Brak błędu – przekierowanie na stronę potwierdzenia
      setStatus("ok");
      setMessage("Konto potwierdzone. Przekierowuję...");
      router.replace("/auth/confirmed");
    }, 0);
  }, [sp, router]);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div style={{ padding: 24 }}>
        <h1>/auth/callback</h1>
        <p>Status: {status}</p>
        <p>{message}</p>
      </div>
    </main>
  );
}
