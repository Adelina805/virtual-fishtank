import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

function getMetadataBase(): URL {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL);
  }
  if (process.env.VERCEL_URL) {
    return new URL(`https://${process.env.VERCEL_URL}`);
  }
  return new URL("http://localhost:3000");
}

const siteTitle =
  "Virtual Fishtank — A Calm, Living Aquarium in Your Browser";
const siteDescription =
  "Drift through glass-clear water painted with slow light: layered fish glide past, your cursor sends soft ripples across the surface, and the whole tank breathes with you. A quiet, visually rich pocket of ocean for focus, rest, or a gentler moment between tasks.";

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  applicationName: "Virtual Fishtank",
  title: {
    default: siteTitle,
    template: "%s | Virtual Fishtank",
  },
  description: siteDescription,
  keywords: [
    "virtual fishtank",
    "interactive aquarium",
    "browser aquarium",
    "relaxing visuals",
    "cursor ripples",
    "layered fish",
    "mobile-friendly",
    "canvas aquarium",
  ],
  authors: [{ name: "Virtual Fishtank" }],
  creator: "Virtual Fishtank",
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    type: "website",
    url: "/",
    siteName: "Virtual Fishtank",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
  },
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
