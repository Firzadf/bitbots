export interface TraitRow {
  id: string;
  layer: string;
  variant: string;
  name: string;
  rarity_tier: string;
}

export interface NftRow {
  id: string;
  token_number: number;
  name: string;
  image_url: string | null;
  rarity_score: number | null;
  rarity_tier: string | null;
  owner_id: string | null;
  minted_at: string | null;
  is_minted: boolean;
  nft_traits?: { traits: TraitRow | TraitRow[] | null }[];
}

export interface ProfileRow {
  id: string;
  username: string;
  display_name: string | null;
  free_mint_quota: number | null;
}

export interface ListingRow {
  id: string;
  nft_id: string;
  seller_id: string;
  price_bits: number;
  active: boolean;
  created_at: string | null;
  nfts?: NftRow | null;
}

export function traitsOf(nft: NftRow): TraitRow[] {
  if (!nft.nft_traits) return [];
  const out: TraitRow[] = [];
  for (const row of nft.nft_traits) {
    if (!row.traits) continue;
    if (Array.isArray(row.traits)) out.push(...row.traits);
    else out.push(row.traits);
  }
  return out;
}

export function formatBits(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "0";
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return "0";
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}
