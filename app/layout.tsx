import type { Metadata, Viewport } from "next";
import "./globals.css";

const site = (process.env.SITE_URL || "https://triveneto.news").replace(/\/$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: { default: "TRIVENETO.NEWS — Notizie dal Nord-Est", template: "%s | TRIVENETO.NEWS" },
  description:
    "Politica, economia, attualità, sostenibilità e innovazione da Trentino-Alto Adige, Veneto, Friuli-Venezia Giulia ed Emilia-Romagna, con le notizie europee e internazionali che contano per il Nord-Est.",
  alternates: { types: { "application/rss+xml": `${site}/rss.xml` } },
  openGraph: { siteName: "TRIVENETO.NEWS", locale: "it_IT", type: "website" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = { themeColor: "#0b3a7e", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
