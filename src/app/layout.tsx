import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Providers } from "@/shared/components/providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
// Prototype's editorial look: Playfair Display for headings, Inter for body —
// used via the `font-serif` utility, opted into per-heading (marketing pages).
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-serif" });

export const metadata: Metadata = {
  title: {
    default: "Pumpkino — Connect travel agencies with trusted DMCs",
    template: "%s · Pumpkino",
  },
  description:
    "Pumpkino is the B2B platform where travel agencies find verified DMCs, request quotes, and manage their whole booking pipeline.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${playfair.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
