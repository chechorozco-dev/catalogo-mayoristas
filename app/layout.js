import "./globals.css";

export const metadata = {
  title: "Catálogo",
  description: "Catálogo digital de productos",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
