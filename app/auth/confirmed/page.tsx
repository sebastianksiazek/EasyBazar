// app/auth/confirmed/page.tsx
import Link from "next/link";

export default function AccountConfirmedPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50">
      <section className="bg-white rounded-xl shadow p-6 max-w-md w-full space-y-4 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">
          Twoje konto zostało potwierdzone ✅
        </h1>
        <p className="text-slate-600">Możesz się teraz zalogować i korzystać z EasyBazar.</p>
        <div className="flex gap-3 justify-center">
          <Link href="/sign-in" className="px-4 py-2 rounded-md bg-slate-900 text-white text-sm">
            Przejdź do logowania
          </Link>
          <Link href="/" className="px-4 py-2 rounded-md border text-sm text-slate-700">
            Strona główna
          </Link>
        </div>
      </section>
    </main>
  );
}
