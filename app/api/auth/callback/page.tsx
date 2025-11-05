// src/app/auth/callback/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";

function parseHashParams(hash: string) {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  return {
    access_token: params.get("access_token"),
    refresh_token: params.get("refresh_token"),
    error: params.get("error") || params.get("error_description"),
  };
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("Potwierdzam logowanie...");

  useEffect(() => {
    const run = async () => {
      const supabase = createBrowserSupabaseClient();

      // 1) Spróbuj wariantu z ?code=...
      const code = sp.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setStatus("error");
          setMessage(error.message || "Błąd potwierdzenia (code).");
          return;
        }
        setStatus("ok");
        setMessage("Konto potwierdzone. Przekierowuję...");
        router.replace("/");
        return;
      }

      // 2) Fallback: tokeny w hash #access_token=...&refresh_token=...
      const { access_token, refresh_token, error } = parseHashParams(window.location.hash || "");

      if (error) {
        setStatus("error");
        setMessage(error);
        return;
      }

      if (access_token && refresh_token) {
        const { error: setErr } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (setErr) {
          setStatus("error");
          setMessage(setErr.message || "Błąd potwierdzenia (hash).");
          return;
        }
        setStatus("ok");
        setMessage("Konto potwierdzone. Przekierowuję...");
        router.replace("/");
        return;
      }

      // 3) Nic nie znaleźliśmy w URL
      setStatus("error");
      setMessage("Brak kodu/autoryzacji w URL.");
    };

    void run();
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1>/auth/callback</h1>
      <p>Status: {status}</p>
      <p>{message}</p>
    </div>
  );
}
