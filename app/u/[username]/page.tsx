import NftCard from "@/components/NftCard";
import EnvNotice from "@/components/EnvNotice";
import { createServerSupabase, hasSupabaseServerEnv } from "@/lib/supabase/server";
import { formatBits, type NftRow, type ProfileRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function UserProfile({ params }: { params: { username: string } }) {
  const hasEnv = hasSupabaseServerEnv();
  const supabase = createServerSupabase();
  let profile: ProfileRow | null = null;
  let nfts: NftRow[] = [];
  let balance: number | null = null;

  if (supabase) {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name, free_mint_quota")
      .eq("username", params.username)
      .single();
    if (data) profile = data as unknown as ProfileRow;

    if (profile) {
      const { data: nftData } = await supabase
        .from("nfts")
        .select("*, nft_traits(traits(*))")
        .eq("owner_id", profile.id)
        .order("minted_at", { ascending: false });
      if (nftData) nfts = nftData as unknown as NftRow[];

      const { data: userData } = await supabase.auth.getUser();
      if (userData.user?.id === profile.id) {
        const { data: balanceData } = await supabase
          .from("balances")
          .select("amount_bits")
          .eq("user_id", profile.id)
          .single();
        if (balanceData) balance = Number(balanceData.amount_bits);
      }
    }
  }

  if (!hasEnv) {
    return (
      <div>
        <EnvNotice />
        <h1 className="font-pixel text-lg text-neon">@{params.username}</h1>
        <p className="mt-3 text-gray-400">Profile cannot be loaded without Supabase.</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div>
        <h1 className="font-pixel text-lg text-neon">User not found</h1>
        <p className="mt-3 text-gray-400">
          Username @{params.username} does not exist. Check the username spelling.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-pixel text-lg md:text-2xl text-neon">@{profile.username}</h1>
      <p className="mt-3 text-gray-300">
        {profile.display_name ? `${profile.display_name} - ` : ""}
        {nfts.length} BitBots owned.
      </p>
      {balance !== null && (
        <p className="mt-2 text-gold">Your balance: {formatBits(balance)} BITS</p>
      )}
      {profile.free_mint_quota !== null && (
        <p className="mt-1 text-sm text-gray-400">
          Remaining free mint quota: {profile.free_mint_quota}
        </p>
      )}

      <section className="mt-8">
        <h2 className="font-pixel text-sm text-cyanx mb-4">Gallery</h2>
        {nfts.length === 0 ? (
          <p className="text-gray-400">
            This user does not own any BitBots yet. Mint from the home page.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {nfts.map((nft) => (
              <NftCard key={nft.id} nft={nft} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
