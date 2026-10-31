import Link from "next/link";
import NftCard from "@/components/NftCard";
import EnvNotice from "@/components/EnvNotice";
import { createServerSupabase, hasSupabaseServerEnv } from "@/lib/supabase/server";
import type { NftRow, ProfileRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Leaderboard BitBots",
  description: "Top BitBots holders and the rarest BitBots NFTs.",
};

export default async function Leaderboard() {
  const hasEnv = hasSupabaseServerEnv();
  const supabase = createServerSupabase();
  let minted: NftRow[] = [];
  let profilesById = new Map<string, ProfileRow>();

  if (supabase) {
    const { data } = await supabase
      .from("nfts")
      .select("*, nft_traits(traits(*))")
      .eq("is_minted", true)
      .range(0, 999);
    if (data) minted = data as unknown as NftRow[];

    const ownerIds = [...new Set(minted.map((n) => n.owner_id).filter(Boolean) as string[])];
    if (ownerIds.length > 0) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, username, display_name, free_mint_quota")
        .in("id", ownerIds);
      if (profileData) {
        for (const p of profileData as unknown as ProfileRow[]) profilesById.set(p.id, p);
      }
    }
  }

  const holderCounts = new Map<string, number>();
  for (const nft of minted) {
    if (!nft.owner_id) continue;
    holderCounts.set(nft.owner_id, (holderCounts.get(nft.owner_id) ?? 0) + 1);
  }
  const holders = [...holderCounts.entries()]
    .map(([id, count]) => ({ id, count, profile: profilesById.get(id) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  const rarest = [...minted]
    .sort((a, b) => (b.rarity_score ?? 0) - (a.rarity_score ?? 0))
    .slice(0, 20);

  return (
    <div>
      {!hasEnv && <EnvNotice />}
      <h1 className="font-pixel text-lg md:text-2xl text-neon">Leaderboard</h1>

      <section className="mt-8">
        <h2 className="font-pixel text-sm text-cyanx mb-4">Top holders</h2>
        {holders.length === 0 ? (
          <p className="text-gray-400">
            No holders yet. The first mint will appear here.
          </p>
        ) : (
          <ol className="space-y-2">
            {holders.map((h) => (
              <li key={h.id} className="card p-3 flex justify-between gap-3">
                {h.profile ? (
                  <Link href={`/u/${h.profile.username}`} className="hover:text-neon">
                    @{h.profile.username}
                  </Link>
                ) : (
                  <span>Unknown</span>
                )}
                <span>{h.count} NFT</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="mt-12">
        <h2 className="font-pixel text-sm text-cyanx mb-4">Rarest NFTs</h2>
        {rarest.length === 0 ? (
          <p className="text-gray-400">No NFTs have been minted yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {rarest.map((nft) => (
              <NftCard key={nft.id} nft={nft} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
