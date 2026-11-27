export const metadata = {
  manifest: "/admin/portal.webmanifest",
  appleWebApp: {
    capable: true,
    title: "RA Mayoristas",
    statusBarStyle: "default",
  },
  icons: { apple: "/admin/icono-180.png", icon: "/admin/icono-192.png" },
};
export default function AdminLayout({ children }) {
  return children;
}
