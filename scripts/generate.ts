// BitBots collection generator.
// Dry-run (no Supabase env): writes PNG files and metadata.json to out/.
// Supabase mode (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY set): uploads
// PNG files to the 'nft-images' bucket and inserts NFT + trait rows.
// The service role key is used only here, on the server/script side.
// It must never appear in client code or in a committed file.
//
// Usage:
//   npm run generate
//   npm run generate -- --count 1000 --out out

import { createClient } from "@supabase/supabase-js";
import { PNG } from "pngjs";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  combinationKey,
  generateCombination,
  rarityScore,
  rarityTierFromScore,
  renderPixelGrid,
  type Combination,
} from "../lib/pixel";

function parseArgs(): { count: number; out: string } {
  const args = process.argv.slice(2);
  let count = 1000;
  let out = "out";
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--count" && args[i + 1]) count = Number(args[i + 1]);
    if (args[i] === "--out" && args[i + 1]) out = args[i + 1];
  }
  if (!Number.isFinite(count) || count <= 0 || count > 10000) {
    throw new Error("count harus angka antara 1 dan 10000");
  }
  return { count, out };
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function gridToPngBuffer(grid: string[][]): Buffer {
  const size = 32;
  const scale = 16;
  const png = new PNG({ width: 512, height: 512 });
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b] = hexToRgb(grid[y][x]);
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const px = x * scale + dx;
          const py = y * scale + dy;
          const idx = (py * 512 + px) * 4;
          png.data[idx] = r;
          png.data[idx + 1] = g;
          png.data[idx + 2] = b;
          png.data[idx + 3] = 255;
        }
      }
    }
  }
  return PNG.sync.write(png);
}

interface GeneratedItem {
  token_number: number;
  name: string;
  combination: Combination;
  key: string;
  hash: string;
  rarity_score: number;
  rarity_tier: string;
  file: string;
}

async function main(): Promise<void> {
  const { count, out } = parseArgs();
  const seen = new Set<string>();
  const items: GeneratedItem[] = [];
  let attempts = 0;

  while (items.length < count) {
    attempts++;
    if (attempts > count * 50) {
      throw new Error("Terlalu banyak percobaan kombinasi kembar, berhenti.");
    }
    const combination = generateCombination();
    const key = combinationKey(combination);
    if (seen.has(key)) continue;
    seen.add(key);
    const score = rarityScore(combination);
    const tokenNumber = items.length + 1;
    items.push({
      token_number: tokenNumber,
      name: `BitBot #${tokenNumber}`,
      combination,
      key,
      hash: createHash("sha256").update(key).digest("hex"),
      rarity_score: score,
      rarity_tier: rarityTierFromScore(score),
      file: `BitBot-${String(tokenNumber).padStart(4, "0")}.png`,
    });
  }

  mkdirSync(out, { recursive: true });

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const useSupabase = Boolean(supabaseUrl && serviceRoleKey);

  if (!useSupabase) {
    console.log("Mode dry-run: SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY tidak diset.");
    console.log("PNG ditulis ke folder lokal, tidak ada upload atau insert DB.");
  }

  const supabase = useSupabase
    ? createClient(supabaseUrl as string, serviceRoleKey as string, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

  const manifest: Record<string, unknown>[] = [];

  for (const item of items) {
    const grid = renderPixelGrid(item.combination);
    const buffer = gridToPngBuffer(grid);
    const localPath = join(out, item.file);
    writeFileSync(localPath, buffer);

    let imageUrl: string | null = null;
    if (supabase) {
      const storagePath = `bitbots/${item.file}`;
      const { error: uploadError } = await supabase.storage
        .from("nft-images")
        .upload(storagePath, buffer, { contentType: "image/png", upsert: true });
      if (uploadError) throw uploadError;
      const { data: publicData } = supabase.storage
        .from("nft-images")
        .getPublicUrl(storagePath);
      imageUrl = publicData.publicUrl;

      const { data: nftRow, error: nftError } = await supabase
        .from("nfts")
        .upsert(
          {
            token_number: item.token_number,
            name: item.name,
            image_url: imageUrl,
            rarity_score: item.rarity_score,
            rarity_tier: item.rarity_tier,
            is_minted: false,
            owner_id: null,
          },
          { onConflict: "token_number" },
        )
        .select("id")
        .single();
      if (nftError) throw nftError;

      for (const layer of Object.keys(item.combination) as (keyof Combination)[]) {
        const trait = item.combination[layer];
        const { data: traitRow, error: traitError } = await supabase
          .from("traits")
          .upsert(
            { layer: trait.layer, variant: trait.variant, name: trait.name, rarity_tier: trait.tier },
            { onConflict: "layer,variant" },
          )
          .select("id")
          .single();
        if (traitError) throw traitError;
        const { error: linkError } = await supabase
          .from("nft_traits")
          .upsert({ nft_id: nftRow.id, trait_id: traitRow.id }, { onConflict: "nft_id,trait_id" });
        if (linkError) throw linkError;
      }
    }

    manifest.push({
      token_number: item.token_number,
      name: item.name,
      hash: item.hash,
      combination: item.key,
      traits: Object.values(item.combination).map((t) => ({
        layer: t.layer,
        variant: t.variant,
        name: t.name,
        tier: t.tier,
      })),
      rarity_score: item.rarity_score,
      rarity_tier: item.rarity_tier,
      file: item.file,
      image_url: imageUrl,
    });
  }

  writeFileSync(join(out, "metadata.json"), JSON.stringify(manifest, null, 2));

  const tierCounts: Record<string, number> = {};
  for (const item of items) tierCounts[item.rarity_tier] = (tierCounts[item.rarity_tier] ?? 0) + 1;
  console.log(`Selesai: ${items.length} NFT unik dari ${attempts} percobaan.`);
  console.log(`Distribusi rarity: ${JSON.stringify(tierCounts)}`);
  console.log(`Output: ${out}/ (PNG + metadata.json)`);
  if (useSupabase) console.log("Mode Supabase: upload dan insert DB selesai.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
