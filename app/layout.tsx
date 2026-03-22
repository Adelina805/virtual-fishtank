import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default:
      "Virtual Fishtank — Relaxing Interactive Aquarium in Your Browser",
    template: "%s | Virtual Fishtank",
  },
  description:
    "Relax with an interactive virtual fishtank: calming layered fish, cursor ripples, and rich visuals built for smooth, mobile-friendly play in your browser.",
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
  openGraph: {
    title:
      "Virtual Fishtank — Relaxing Interactive Aquarium in Your Browser",
    description:
      "Relax with an interactive virtual fishtank: calming layered fish, cursor ripples, and rich visuals built for smooth, mobile-friendly play in your browser.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title:
      "Virtual Fishtank — Relaxing Interactive Aquarium in Your Browser",
    description:
      "Relax with an interactive virtual fishtank: calming layered fish, cursor ripples, and rich visuals built for smooth, mobile-friendly play in your browser.",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
