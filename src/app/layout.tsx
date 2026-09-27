import "./globals.css";
import type { Metadata, Viewport } from "next";
import { defaultLocale, dir } from "@/i18n/messages";
export const metadata: Metadata = {
  title: "إقرأ | Eqraa", description: "ختمة جماعية يومية", manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "إقرأ" },
  icons: { icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }], apple: [{ url: "/icons/icon-180.png", sizes: "180x180", type: "image/png" }] },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#1E6B5A" };
const themeInit = `try{var t=localStorage.getItem("eqraa-theme");if(t)document.documentElement.dataset.theme=t}catch(e){}`;
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang={defaultLocale} dir={dir(defaultLocale)} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeInit }} /></head>
      <body>
        <a href="#main" className="skip-link">تجاوز إلى المحتوى</a>
        {children}
        <footer dir="ltr" className="border-t border-line px-6 py-5 text-center text-xs text-muted">
          © 2026 Eqraa · Made with 💚 by Mohamed Saad
        </footer>
      </body>
    </html>
  );
}
