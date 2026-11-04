import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { paletteScript } from "@/lib/palettes";
import "./globals.css";

// One sturdy, technical family for everything: text, headings, and the
// tabular numbers in mileage and money.
const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

// VINs, part numbers, and receipts.
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Revlog: car maintenance and mod tracker",
  description:
    "Track every oil change, repair, and mod for your cars, with reminders before service is due.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${plexSans.variable} ${plexMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Runs before first paint so a saved palette doesn't flash Redline. */}
        <script dangerouslySetInnerHTML={{ __html: paletteScript }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
