import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "BitBots - NFT Robot Pixel Art (Off-Chain)",
  description: "Koleksi robot pixel art BitBots. Mint, kumpulkan, dan jual dengan saldo BITS. Tanpa smart contract.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
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
          Lewati ke konten utama
        </a>
        <Header />
        <main id="main" className="max-w-6xl mx-auto px-4 py-8">{children}</main>
        <footer className="max-w-6xl mx-auto px-4 pb-10 text-xs text-gray-500">
          <p>
            BitBots adalah NFT off-chain. Kepemilikan dicatat di database
            Supabase, bukan di smart contract. Saldo BITS adalah saldo demo
            internal untuk MVP.
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
