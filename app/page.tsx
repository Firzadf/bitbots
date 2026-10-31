import MintButton from "@/components/MintButton";
import PromoForm from "@/components/PromoForm";
import NftCard from "@/components/NftCard";
import EnvNotice from "@/components/EnvNotice";
import { createServerSupabase, hasSupabaseServerEnv } from "@/lib/supabase/server";
import type { NftRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  const hasEnv = hasSupabaseServerEnv();
  const supabase = createServerSupabase();
  let latest: NftRow[] = [];
  let mintedCount = 0;
  let totalCount = 0;

  if (supabase) {
    const { data } = await supabase
      .from("nfts")
      .select("*, nft_traits(traits(*))")
      .eq("is_minted", true)
      .order("minted_at", { ascending: false })
      .limit(12);
    if (data) latest = data as unknown as NftRow[];

    const minted = await supabase
      .from("nfts")
      .select("id", { count: "exact", head: true })
      .eq("is_minted", true);
    mintedCount = minted.count ?? 0;

    const total = await supabase.from("nfts").select("id", { count: "exact", head: true });
    totalCount = total.count ?? 0;
  }

  return (
    <div>
      {!hasEnv && <EnvNotice />}
      <section>
        <h1 className="font-pixel text-lg md:text-2xl leading-relaxed text-neon">
          Robot pixel yang bisa kamu mint, kumpulkan, dan jual.
        </h1>
        <p className="mt-4 max-w-2xl text-gray-300">
          BitBots adalah koleksi 1.000 robot pixel art 32x32. Kepemilikan
          dicatat di database, tanpa smart contract. Setiap user baru mendapat
          100 BITS demo dan 3 free mint awal.
        </p>
        <div className="mt-6 flex flex-wrap gap-6 items-start">
          <MintButton />
          <div className="w-full max-w-md">
            <PromoForm />
          </div>
        </div>
        {hasEnv && (
          <p className="mt-6 text-sm text-gray-400">
            Sudah dimint: {mintedCount} dari {totalCount} BitBots.
          </p>
        )}
      </section>

      <section className="mt-12">
        <h2 className="font-pixel text-sm text-cyanx mb-4">Mint terbaru</h2>
        {latest.length === 0 ? (
          <p className="text-gray-400">
            Belum ada NFT yang dimint. Login dengan X, lalu tekan Mint Gratis.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {latest.map((nft) => (
              <NftCard key={nft.id} nft={nft} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="font-pixel text-sm text-cyanx mb-4">Cara main</h2>
        <ol className="list-decimal ml-5 space-y-2 text-gray-300">
          <li>Login dengan X. Profil dan saldo 100 BITS dibuat otomatis.</li>
          <li>Tekan Mint Gratis untuk mendapat satu BitBot acak.</li>
          <li>Lihat koleksimu di halaman profil, transfer, atau jual di Market.</li>
        </ol>
      </section>
    </div>
  );
}
