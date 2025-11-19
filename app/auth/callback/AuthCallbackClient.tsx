// app/auth/callback/AuthCallbackClient.tsx
"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AuthCallbackClient() {
  const router = useRouter();
  const sp = useSearchParams();

  useEffect(() => {
    const error = sp.get("error") || sp.get("error_description");

    if (error) {
      // Możesz dopiąć np. ?status=error, jeśli chcesz pokazać inny tekst
      router.replace("/auth/confirmed?status=error");
      return;
    }

    // Sukces – konto potwierdzone
    router.replace("/auth/confirmed?status=success");
  }, [sp, router]);

  // Możesz tu zwrócić spinner, ale nie musisz – i tak szybko przekieruje
  return <div>Potwierdzam konto...</div>;
}
