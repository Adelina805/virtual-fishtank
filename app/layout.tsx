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
  "Aquacalma | Interactive Aquarium for Focus, Calm, and Play";
const siteDescription =
  "Aquacalma is an interactive digital aquarium designed for calm, focus, and play. Guide your breathing, grow the environment through sustained attention, and interact with responsive fish in a soothing digital ecosystem.";
const socialDescription =
  "Aquacalma is a responsive digital aquarium exploring calm, attention, and play through guided breathing, evolving focus sessions, and interactive fish behavior.";

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  applicationName: "Aquacalma",
  title: {
    default: siteTitle,
    template: "%s | Aquacalma",
  },
  description: siteDescription,
  keywords: [
    "Aquacalma",
    "interactive aquarium",
    "digital calm",
    "focus timer",
    "breathing exercise",
    "generative art",
    "interactive art",
    "calming website",
    "digital ecosystem",
    "study tool",
    "soothing experience",
    "fish simulation",
    "electronic literature",
    "creative coding",
    "wellness design",
  ],
  authors: [{ name: "Adelina Martinez" }],
  creator: "Adelina Martinez",
  openGraph: {
    title: siteTitle,
    description: socialDescription,
    type: "website",
    url: "/",
    siteName: "Aquacalma",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: socialDescription,
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
