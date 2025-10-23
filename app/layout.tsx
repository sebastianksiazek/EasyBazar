import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "EasyBazar",
  description: "Portal ogłoszeniowy studentów",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body className="min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
