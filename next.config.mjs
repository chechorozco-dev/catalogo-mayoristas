/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Solo permitir optimizar imágenes públicas de nuestro almacenamiento.
    // Los enlaces externos (p. ej. Google Drive) mantienen su URL original.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "hxvujossrzoqqnxxskzb.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
    formats: ["image/webp"],
    qualities: [75, 80, 85],
    // Equilibrio entre uso de la caché y actualizaciones de fotografías.
    minimumCacheTTL: 300,
  },
};

export default nextConfig;
