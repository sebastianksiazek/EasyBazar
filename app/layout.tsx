import "./globals.css";
import Providers from "./providers";
import Navbar from "@/components/ui/navbar"; // <--- Import

export const metadata = {
  title: "EasyBazar",
  description: "Portal ogłoszeniowy studentów",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body className="min-h-screen flex flex-col">
        {" "}
        {/* flex-col dla stopki w przyszłości */}
        <Providers>
          <Navbar /> {/* <--- Dodaj tutaj */}
          <main className="flex-1">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
