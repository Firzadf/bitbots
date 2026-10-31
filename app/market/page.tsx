import NftCard from "@/components/NftCard";
import EnvNotice from "@/components/EnvNotice";
import { BuyButton, CancelButton } from "@/components/MarketActions";
import { createServerSupabase, hasSupabaseServerEnv } from "@/lib/supabase/server";
import { formatBits, type ListingRow, type NftRow, type ProfileRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Market BitBots",
  description: "Beli dan jual BitBots dengan saldo BITS. Fee market 2,5 persen ke treasury.",
};

export default async function Market() {
  const hasEnv = hasSupabaseServerEnv();
  const supabase = createServerSupabase();
  let listings: ListingRow[] = [];
  let nftsById = new Map<string, NftRow>();
  let profilesById = new Map<string, ProfileRow>();
  let viewerId: string | null = null;

  if (supabase) {
    const { data: userData } = await supabase.auth.getUser();
    viewerId = userData.user?.id ?? null;

    const { data } = await supabase
      .from("listings")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .range(0, 199);
    if (data) listings = data as unknown as ListingRow[];

    const nftIds = [...new Set(listings.map((l) => l.nft_id))];
    const sellerIds = [...new Set(listings.map((l) => l.seller_id))];
    if (nftIds.length > 0) {
      const { data: nftData } = await supabase
        .from("nfts")
        .select("*, nft_traits(traits(*))")
        .in("id", nftIds);
      if (nftData) {
        for (const nft of nftData as unknown as NftRow[]) nftsById.set(nft.id, nft);
      }
    }
    if (sellerIds.length > 0) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, username, display_name, free_mint_quota")
        .in("id", sellerIds);
      if (profileData) {
        for (const p of profileData as unknown as ProfileRow[]) profilesById.set(p.id, p);
      }
    }
  }

  return (
    <div>
      {!hasEnv && <EnvNotice />}
      <h1 className="font-pixel text-lg md:text-2xl text-neon">Market</h1>
      <p className="mt-3 text-gray-300">
        Beli BitBots dengan saldo BITS. Penjual menerima 97,5 persen harga,
        fee 2,5 persen masuk ke treasury. Saldo tidak pernah diubah dari client.
      </p>

      <section className="mt-8">
        <h2 className="font-pixel text-sm text-cyanx mb-4">
          Listing aktif: {listings.length}
        </h2>
        {listings.length === 0 ? (
          <p className="text-gray-400">
            Belum ada listing aktif. Pemilik NFT bisa membuat listing dari
            halaman detail NFT.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {listings.map((listing) => {
              const nft = nftsById.get(listing.nft_id);
              const seller = profilesById.get(listing.seller_id);
              if (!nft) return null;
              const isSeller = viewerId !== null && viewerId === listing.seller_id;
              return (
                <div key={listing.id} className="card p-3">
                  <NftCard nft={nft} price={listing.price_bits} />
                  <p className="text-sm mt-3">
                    Penjual: {seller ? `@${seller.username}` : "tidak diketahui"}
                  </p>
                  <p className="text-sm text-gold mt-1">
                    Harga: {formatBits(listing.price_bits)} BITS
                  </p>
                  <div className="flex gap-2 mt-3">
                    {!isSeller && <BuyButton listingId={listing.id} />}
                    {isSeller && <CancelButton listingId={listing.id} />}
                  </div>
                  {!viewerId && (
                    <p className="text-xs text-gray-500 mt-2">
                      Login dengan X untuk membeli.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
