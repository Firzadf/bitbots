import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "BitBots - Pixel Robot Art NFTs (Off-Chain)",
  description: "The BitBots pixel robot art collection. Mint, collect, and sell with a BITS balance. No smart contract.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        <Header />
        <main id="main" className="max-w-6xl mx-auto px-4 py-8">{children}</main>
        <footer className="max-w-6xl mx-auto px-4 pb-10 text-xs text-gray-500">
          <p>
            BitBots are off-chain NFTs. Ownership is recorded in the Supabase
            database, not in a smart contract. The BITS balance is an internal
            demo balance for the MVP.
          </p>
          <p className="mt-2">
            <Link href="/" className="hover:text-neon">Home</Link> -{" "}
            <Link href="/explore" className="hover:text-neon">Explore</Link> -{" "}
            <Link href="/market" className="hover:text-neon">Market</Link> -{" "}
            <Link href="/leaderboard" className="hover:text-neon">Leaderboard</Link>
          </p>
        </footer>
      </body>
    </html>
  );
}
