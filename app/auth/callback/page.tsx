// app/auth/callback/page.tsx
import { Suspense } from "react";
import AuthCallbackClient from "./AuthCallbackClient";

export default function AuthCallbackPage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <Suspense fallback={<div>Ładuję callback...</div>}>
        <AuthCallbackClient />
      </Suspense>
    </main>
  );
}
