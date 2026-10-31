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
          Pixel robots you can mint, collect, and sell.
        </h1>
        <p className="mt-4 max-w-2xl text-gray-300">
          BitBots is a collection of 1,000 32x32 pixel art robots. Ownership
          is recorded in the database, with no smart contract. Every new user
          gets 100 demo BITS and 3 initial free mints.
        </p>
        <div className="mt-6 flex flex-wrap gap-6 items-start">
          <MintButton />
          <div className="w-full max-w-md">
            <PromoForm />
          </div>
        </div>
        {hasEnv && (
          <p className="mt-6 text-sm text-gray-400">
            Minted: {mintedCount} of {totalCount} BitBots.
          </p>
        )}
      </section>

      <section className="mt-12">
        <h2 className="font-pixel text-sm text-cyanx mb-4">Latest mints</h2>
        {latest.length === 0 ? (
          <p className="text-gray-400">
            No NFTs have been minted yet. Log in with X, then press Free Mint.
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
        <h2 className="font-pixel text-sm text-cyanx mb-4">How to play</h2>
        <ol className="list-decimal ml-5 space-y-2 text-gray-300">
          <li>Log in with X. Your profile and 100 BITS balance are created automatically.</li>
          <li>Press Free Mint to get one random BitBot.</li>
          <li>View your collection on your profile page, transfer it, or sell it on the Market.</li>
        </ol>
      </section>
    </div>
  );
}
