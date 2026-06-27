import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "swiper/css";
import "swiper/css/autoplay";
import "swiper/css/pagination";
import "swiper/css/navigation";
import "swiper/css/free-mode";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FLIXNET - Watch Movies & TV Shows Online",
  description:
    "Stream unlimited movies and TV shows online. Watch the latest releases, trending content, and exclusive originals on FLIXNET.",
  keywords: "movies, tv shows, streaming, watch online, netflix alternative, flixnet",
  authors: [{ name: "FLIXNET" }],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FLIXNET",
  },
  openGraph: {
    title: "FLIXNET - Watch Movies & TV Shows Online",
    description:
      "Stream unlimited movies and TV shows online. Watch the latest releases, trending content, and exclusive originals on FLIXNET.",
    siteName: "FLIXNET",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FLIXNET - Watch Movies & TV Shows Online",
    description: "Stream unlimited movies and TV shows online.",
  },
};

export const viewport: Viewport = {
  themeColor: "#f4f5f7",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#f4f5f7" />
      </head>
      <body className={`${geistSans.variable} antialiased bg-background text-foreground`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
