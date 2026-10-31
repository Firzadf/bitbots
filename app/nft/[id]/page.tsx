import Link from "next/link";
import EnvNotice from "@/components/EnvNotice";
import TransferForm from "@/components/TransferForm";
import ListForm from "@/components/ListForm";
import { BuyButton, CancelButton } from "@/components/MarketActions";
import { createServerSupabase, hasSupabaseServerEnv } from "@/lib/supabase/server";
import { formatBits, traitsOf, type ListingRow, type NftRow, type ProfileRow } from "@/lib/types";

export const dynamic = "force-dynamic";

interface TransferRow {
  id: string;
  nft_id: string;
  from_id: string | null;
  to_id: string | null;
  type: string | null;
  created_at: string | null;
}

interface SaleRow {
  id: string;
  nft_id: string;
  seller_id: string;
  buyer_id: string;
  price_bits: number;
  fee_bits: number | null;
  created_at: string | null;
}

interface HistoryItem {
  key: string;
  label: string;
  detail: string;
  createdAt: string;
}

export default async function NftDetail({ params }: { params: { id: string } }) {
  const hasEnv = hasSupabaseServerEnv();
  const supabase = createServerSupabase();
  let nft: NftRow | null = null;
  let owner: ProfileRow | null = null;
  let history: HistoryItem[] = [];
  let activeListing: ListingRow | null = null;
  let viewerId: string | null = null;
  let isOwner = false;

  if (supabase) {
    const { data: userData } = await supabase.auth.getUser();
    viewerId = userData.user?.id ?? null;

    const { data } = await supabase
      .from("nfts")
      .select("*, nft_traits(traits(*))")
      .eq("id", params.id)
      .single();
    if (data) nft = data as unknown as NftRow;

    if (nft) {
      isOwner = viewerId !== null && viewerId === nft.owner_id;

      if (nft.owner_id) {
        const { data: ownerData } = await supabase
          .from("profiles")
          .select("id, username, display_name, free_mint_quota")
          .eq("id", nft.owner_id)
          .single();
        if (ownerData) owner = ownerData as unknown as ProfileRow;
      }

      const { data: transferData } = await supabase
        .from("transfers")
        .select("*")
        .eq("nft_id", nft.id)
        .order("created_at", { ascending: false });
      const transfers = (transferData ?? []) as unknown as TransferRow[];

      const { data: saleData } = await supabase
        .from("sales")
        .select("*")
        .eq("nft_id", nft.id)
        .order("created_at", { ascending: false });
      const sales = (saleData ?? []) as unknown as SaleRow[];

      const { data: listingData } = await supabase
        .from("listings")
        .select("*")
        .eq("nft_id", nft.id)
        .eq("active", true)
        .limit(1)
        .single();
      if (listingData) activeListing = listingData as unknown as ListingRow;

      const personIds = new Set<string>();
      for (const t of transfers) {
        if (t.from_id) personIds.add(t.from_id);
        if (t.to_id) personIds.add(t.to_id);
      }
      for (const s of sales) {
        personIds.add(s.seller_id);
        personIds.add(s.buyer_id);
      }
      const profilesById = new Map<string, ProfileRow>();
      if (personIds.size > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, username, display_name, free_mint_quota")
          .in("id", [...personIds]);
        if (profileData) {
          for (const p of profileData as unknown as ProfileRow[]) profilesById.set(p.id, p);
        }
      }
      const nameOf = (id: string | null): string => {
        if (!id) return "sistem";
        return profilesById.get(id)?.username ? `@${profilesById.get(id)?.username}` : "tidak diketahui";
      };

      const items: HistoryItem[] = [];
      for (const t of transfers) {
        items.push({
          key: `t-${t.id}`,
          label: t.type === "mint" ? "Mint" : t.type === "sale" ? "Penjualan" : "Transfer",
          detail: `${nameOf(t.from_id)} ke ${nameOf(t.to_id)}`,
          createdAt: t.created_at ?? "",
        });
      }
      for (const s of sales) {
        items.push({
          key: `s-${s.id}`,
          label: "Penjualan",
          detail: `${nameOf(s.seller_id)} ke ${nameOf(s.buyer_id)} seharga ${formatBits(s.price_bits)} BITS`,
          createdAt: s.created_at ?? "",
        });
      }
      history = items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    }
  }

  if (!hasEnv) {
    return (
      <div>
        <EnvNotice />
        <h1 className="font-pixel text-lg text-neon">Detail NFT</h1>
        <p className="mt-3 text-gray-400">Detail tidak bisa dimuat tanpa Supabase.</p>
      </div>
    );
  }

  if (!nft) {
    return (
      <div>
        <h1 className="font-pixel text-lg text-neon">NFT tidak ditemukan</h1>
        <p className="mt-3 text-gray-400">Periksa kembali ID NFT.</p>
      </div>
    );
  }

  const traits = traitsOf(nft);

  return (
    <div>
      <h1 className="font-pixel text-lg md:text-2xl text-neon">{nft.name}</h1>
      <p className="mt-3 text-gray-300">
        #{nft.token_number} - {nft.rarity_tier ?? "-"} - Skor {nft.rarity_score ?? "-"}
      </p>

      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <div>
          {nft.image_url && nft.image_url.startsWith("https://") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={nft.image_url}
              alt={nft.name}
              width={512}
              height={512}
              className="pixel-img w-full aspect-square object-cover bg-black border-2 border-[#2a2a4a]"
            />
          ) : (
            <div className="w-full aspect-square bg-black border-2 border-[#2a2a4a] flex items-center justify-center text-gray-500">
              Gambar belum tersedia
            </div>
          )}
        </div>

        <div className="space-y-4">
          <section className="card p-4">
            <h2 className="font-pixel text-[10px] text-cyanx mb-3">Pemilik</h2>
            {owner ? (
              <p>
                <Link href={`/u/${owner.username}`} className="hover:text-neon">
                  @{owner.username}
                </Link>
              </p>
            ) : (
              <p className="text-gray-400">Belum dimiliki siapa pun.</p>
            )}
            <p className="text-sm mt-2">{nft.is_minted ? "Sudah dimint" : "Belum dimint"}</p>
            {activeListing && (
              <p className="text-gold mt-2">
                Dijual: {formatBits(activeListing.price_bits)} BITS
              </p>
            )}
          </section>

          <section className="card p-4">
            <h2 className="font-pixel text-[10px] text-cyanx mb-3">Traits</h2>
            {traits.length === 0 ? (
              <p className="text-gray-400 text-sm">Traits belum tercatat.</p>
            ) : (
              <ul className="space-y-2">
                {traits.map((t) => (
                  <li key={t.id} className="flex justify-between gap-3 text-sm">
                    <span className="text-gray-400">{t.layer}</span>
                    <span>{t.name} ({t.rarity_tier})</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {isOwner && (
            <>
              <TransferForm nftId={nft.id} />
              {!activeListing && <ListForm nftId={nft.id} />}
              {activeListing && <CancelButton listingId={activeListing.id} />}
            </>
          )}
          {!isOwner && activeListing && (
            <div className="card p-4">
              <BuyButton listingId={activeListing.id} />
            </div>
          )}
          {!isOwner && !activeListing && (
            <p className="text-sm text-gray-500">
              Hanya pemilik yang bisa transfer atau membuat listing untuk NFT ini.
            </p>
          )}
        </div>
      </div>

      <section className="mt-10">
        <h2 className="font-pixel text-sm text-cyanx mb-4">Riwayat pemilik</h2>
        {history.length === 0 ? (
          <p className="text-gray-400">
            Belum ada riwayat. NFT ini belum dimint atau riwayat belum tercatat.
          </p>
        ) : (
          <ul className="space-y-2">
            {history.map((h) => (
              <li key={h.key} className="card p-3 flex justify-between gap-3">
                <span>
                  <strong>{h.label}</strong>: {h.detail}
                </span>
                <span className="text-xs text-gray-500">
                  {h.createdAt ? new Date(h.createdAt).toLocaleString("id-ID") : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
