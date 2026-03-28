import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Affinitrax — All Signal. No Noise.",
    template: "%s | Affinitrax",
  },
  description:
    "Premium traffic brokerage platform. Connect verified buyers and sellers across Crypto, FX, Casino, and Gambling verticals. CPA & CRG models. 10+ GEOs.",
  keywords: [
    "traffic brokerage",
    "CPA traffic",
    "crypto traffic",
    "affiliate traffic",
    "media buying",
  ],
  openGraph: {
    type: "website",
    siteName: "Affinitrax",
    title: "Affinitrax — All Signal. No Noise.",
    description: "Premium traffic brokerage. Verified buyers and sellers. CPA & CRG.",
    images: [{ url: "https://affinitrax.com/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Affinitrax — All Signal. No Noise.",
    description: "Premium traffic brokerage. Verified buyers and sellers. CPA & CRG.",
    images: ["https://affinitrax.com/opengraph-image"],
  },
  icons: {
    icon: "/icon",
    apple: "/apple-icon",
  },
  manifest: "/manifest.webmanifest",
  other: {
    "theme-color": "#07070f",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "Affinitrax",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        {/* Clash Display via Fontshare CDN */}
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
