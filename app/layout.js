import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

export const metadata = {
  title: "Catálogo",
  description: "Catálogo digital de productos",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
