import NftCard from "@/components/NftCard";
import EnvNotice from "@/components/EnvNotice";
import { createServerSupabase, hasSupabaseServerEnv } from "@/lib/supabase/server";
import { traitsOf, type NftRow } from "@/lib/types";
import { LAYERS as PIXEL_LAYERS, TRAITS } from "@/lib/pixel";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Explore BitBots",
  description: "Browse minted BitBots, filtered by trait and rarity.",
};

interface SearchParams {
  rarity?: string;
  layer?: string;
  variant?: string;
}

export default async function Explore({ searchParams }: { searchParams: SearchParams }) {
  const hasEnv = hasSupabaseServerEnv();
  const supabase = createServerSupabase();
  const rarity = searchParams.rarity ?? "";
  const layer = searchParams.layer ?? "";
  const variant = (searchParams.variant ?? "").trim().toLowerCase();

  let all: NftRow[] = [];
  if (supabase) {
    const { data } = await supabase
      .from("nfts")
      .select("*, nft_traits(traits(*))")
      .eq("is_minted", true)
      .order("minted_at", { ascending: false })
      .range(0, 999);
    if (data) all = data as unknown as NftRow[];
  }

  const filtered = all.filter((nft) => {
    if (rarity && nft.rarity_tier !== rarity) return false;
    if (!layer && !variant) return true;
    const traits = traitsOf(nft);
    return traits.some((t) => {
      if (layer && t.layer !== layer) return false;
      if (variant && t.variant.toLowerCase() !== variant) return false;
      return true;
    });
  });

  const variantOptions = layer && layer in TRAITS ? TRAITS[layer as keyof typeof TRAITS] : [];

  return (
    <div>
      {!hasEnv && <EnvNotice />}
      <h1 className="font-pixel text-lg md:text-2xl text-neon">Explore BitBots</h1>
      <p className="mt-3 text-gray-300">
        All minted BitBots. Filter by rarity and trait.
      </p>

      <form method="get" className="card p-4 mt-6 flex flex-wrap gap-3 items-end">
        <div>
          <label htmlFor="rarity" className="block text-sm mb-1">Rarity</label>
          <select id="rarity" name="rarity" defaultValue={rarity} className="input-pixel">
            <option value="">All rarities</option>
            <option value="Common">Common</option>
            <option value="Rare">Rare</option>
            <option value="Epic">Epic</option>
            <option value="Legendary">Legendary</option>
          </select>
        </div>
        <div>
          <label htmlFor="layer" className="block text-sm mb-1">Trait layer</label>
          <select id="layer" name="layer" defaultValue={layer} className="input-pixel">
            <option value="">All layers</option>
            {PIXEL_LAYERS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="variant" className="block text-sm mb-1">Trait variant</label>
          <select id="variant" name="variant" defaultValue={variant} className="input-pixel">
            <option value="">All variants</option>
            {variantOptions.map((t) => (
              <option key={t.variant} value={t.variant}>
                {t.name} ({t.tier})
              </option>
            ))}
          </select>
        </div>
        <button className="btn-neon px-4 py-2 text-sm">Filter</button>
        <a href="/explore" className="btn-ghost px-4 py-2 text-sm">Reset</a>
      </form>
      <p className="text-xs text-gray-500 mt-3">
        Pick a layer first to see its variants. The variant filter matches
        the variant name in the database exactly.
      </p>

      <section className="mt-8">
        <h2 className="font-pixel text-sm text-cyanx mb-4">
          Results: {filtered.length} BitBots
        </h2>
        {filtered.length === 0 ? (
          <p className="text-gray-400">
            No matching NFTs yet. Change the filters, or mint from the home page.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {filtered.map((nft) => (
              <NftCard key={nft.id} nft={nft} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
