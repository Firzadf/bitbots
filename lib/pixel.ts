// BitBots pixel art generator.
// All art is produced by code below: palettes, rectangles and small
// patterns. No image is downloaded from the internet.

export type RarityTier = "Common" | "Rare" | "Epic" | "Legendary";

export type Layer =
  | "background"
  | "body"
  | "head"
  | "eyes"
  | "antenna"
  | "accessory";

export const LAYERS: Layer[] = [
  "background",
  "body",
  "head",
  "eyes",
  "antenna",
  "accessory",
];

export interface TraitVariant {
  layer: Layer;
  variant: string;
  name: string;
  tier: RarityTier;
}

export const TIER_PROBABILITY: Record<RarityTier, number> = {
  Common: 0.6,
  Rare: 0.25,
  Epic: 0.12,
  Legendary: 0.03,
};

export const TIER_WEIGHT: Record<RarityTier, number> = {
  Common: 10,
  Rare: 25,
  Epic: 50,
  Legendary: 100,
};

export const TRAITS: Record<Layer, TraitVariant[]> = {
  background: [
    { layer: "background", variant: "void-black", name: "Void Black", tier: "Common" },
    { layer: "background", variant: "teal-grid", name: "Teal Grid", tier: "Common" },
    { layer: "background", variant: "purple-dusk", name: "Purple Dusk", tier: "Common" },
    { layer: "background", variant: "circuit", name: "Circuit Board", tier: "Rare" },
    { layer: "background", variant: "neon-city", name: "Neon City", tier: "Epic" },
    { layer: "background", variant: "galaxy", name: "Galaxy", tier: "Legendary" },
  ],
  body: [
    { layer: "body", variant: "steel-grey", name: "Steel Grey", tier: "Common" },
    { layer: "body", variant: "copper", name: "Copper", tier: "Common" },
    { layer: "body", variant: "mint", name: "Mint", tier: "Common" },
    { layer: "body", variant: "cobalt", name: "Cobalt", tier: "Rare" },
    { layer: "body", variant: "crimson", name: "Crimson", tier: "Rare" },
    { layer: "body", variant: "gold", name: "Gold", tier: "Epic" },
    { layer: "body", variant: "violet-neon", name: "Violet Neon", tier: "Epic" },
    { layer: "body", variant: "obsidian", name: "Obsidian", tier: "Legendary" },
  ],
  head: [
    { layer: "head", variant: "square", name: "Square Head", tier: "Common" },
    { layer: "head", variant: "round", name: "Round Head", tier: "Common" },
    { layer: "head", variant: "visor", name: "Visor Head", tier: "Rare" },
    { layer: "head", variant: "horned", name: "Horned Head", tier: "Rare" },
    { layer: "head", variant: "crown", name: "Crown Head", tier: "Epic" },
    { layer: "head", variant: "halo", name: "Halo Head", tier: "Legendary" },
  ],
  eyes: [
    { layer: "eyes", variant: "dot-blue", name: "Blue Dots", tier: "Common" },
    { layer: "eyes", variant: "dot-green", name: "Green Dots", tier: "Common" },
    { layer: "eyes", variant: "dot-red", name: "Red Dots", tier: "Common" },
    { layer: "eyes", variant: "visor-cyan", name: "Cyan Visor", tier: "Rare" },
    { layer: "eyes", variant: "visor-amber", name: "Amber Visor", tier: "Rare" },
    { layer: "eyes", variant: "x-eyes", name: "X Eyes", tier: "Epic" },
    { layer: "eyes", variant: "star", name: "Star Eyes", tier: "Legendary" },
  ],
  antenna: [
    { layer: "antenna", variant: "single", name: "Single Antenna", tier: "Common" },
    { layer: "antenna", variant: "double", name: "Double Antenna", tier: "Common" },
    { layer: "antenna", variant: "dish", name: "Dish Antenna", tier: "Rare" },
    { layer: "antenna", variant: "lightning", name: "Lightning Antenna", tier: "Epic" },
    { layer: "antenna", variant: "orb", name: "Orb Antenna", tier: "Legendary" },
  ],
  accessory: [
    { layer: "accessory", variant: "scarf-red", name: "Red Scarf", tier: "Common" },
    { layer: "accessory", variant: "headphones", name: "Headphones", tier: "Common" },
    { layer: "accessory", variant: "glasses", name: "Glasses", tier: "Common" },
    { layer: "accessory", variant: "chain", name: "Gold Chain", tier: "Rare" },
    { layer: "accessory", variant: "cap", name: "Arcade Cap", tier: "Rare" },
    { layer: "accessory", variant: "jetpack", name: "Jetpack", tier: "Epic" },
    { layer: "accessory", variant: "wings", name: "Neon Wings", tier: "Epic" },
    { layer: "accessory", variant: "aura", name: "Golden Aura", tier: "Legendary" },
  ],
};

export type Combination = Record<Layer, TraitVariant>;

export type Rng = () => number;

function pickTier(rng: Rng): RarityTier {
  const roll = rng();
  if (roll < 0.6) return "Common";
  if (roll < 0.85) return "Rare";
  if (roll < 0.97) return "Epic";
  return "Legendary";
}

export function pickTrait(layer: Layer, rng: Rng = Math.random): TraitVariant {
  const all = TRAITS[layer];
  const tier = pickTier(rng);
  const inTier = all.filter((t) => t.tier === tier);
  const pool = inTier.length > 0 ? inTier : all;
  return pool[Math.floor(rng() * pool.length)];
}

export function generateCombination(rng: Rng = Math.random): Combination {
  const combo = {} as Combination;
  for (const layer of LAYERS) {
    combo[layer] = pickTrait(layer, rng);
  }
  return combo;
}

export function combinationKey(combo: Combination): string {
  return LAYERS.map((layer) => `${layer}:${combo[layer].variant}`).join("|");
}

export function rarityScore(combo: Combination): number {
  return LAYERS.reduce((sum, layer) => sum + TIER_WEIGHT[combo[layer].tier], 0);
}

export function rarityTierFromScore(score: number): RarityTier {
  if (score >= 260) return "Legendary";
  if (score >= 180) return "Epic";
  if (score >= 110) return "Rare";
  return "Common";
}

// ---- 32x32 pixel grid ----

export type Grid = string[][];

function createGrid(fill: string): Grid {
  return Array.from({ length: 32 }, () => Array.from({ length: 32 }, () => fill));
}

function set(grid: Grid, x: number, y: number, color: string): void {
  if (x >= 0 && x < 32 && y >= 0 && y < 32) grid[y][x] = color;
}

function rect(grid: Grid, x: number, y: number, w: number, h: number, color: string): void {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      set(grid, x + dx, y + dy, color);
    }
  }
}

function fillAll(grid: Grid, color: string): void {
  rect(grid, 0, 0, 32, 32, color);
}

function drawBackground(grid: Grid, variant: string): void {
  switch (variant) {
    case "void-black":
      fillAll(grid, "#0a0a12");
      break;
    case "teal-grid":
      fillAll(grid, "#062b26");
      for (let x = 0; x < 32; x += 8) rect(grid, x, 0, 1, 32, "#0e4a3f");
      for (let y = 0; y < 32; y += 8) rect(grid, 0, y, 32, 1, "#0e4a3f");
      break;
    case "purple-dusk":
      for (let y = 0; y < 32; y++) {
        rect(grid, 0, y, 32, 1, y < 16 ? "#1b1035" : "#33135e");
      }
      break;
    case "circuit":
      fillAll(grid, "#0d1b2a");
      for (const x of [4, 12, 20, 28]) rect(grid, x, 0, 1, 32, "#1e3a5f");
      for (const y of [8, 24]) rect(grid, 0, y, 32, 1, "#1e3a5f");
      for (const [x, y] of [[4, 8], [12, 24], [20, 8], [28, 24]]) rect(grid, x, y, 2, 2, "#00e5ff");
      break;
    case "neon-city":
      fillAll(grid, "#12081f");
      rect(grid, 2, 20, 5, 12, "#1f2a5a");
      rect(grid, 25, 18, 5, 14, "#1f2a5a");
      rect(grid, 3, 22, 1, 1, "#00e5ff");
      rect(grid, 5, 25, 1, 1, "#ffd319");
      rect(grid, 26, 20, 1, 1, "#00ff9c");
      rect(grid, 28, 24, 1, 1, "#ff2ec4");
      break;
    case "galaxy":
      fillAll(grid, "#050514");
      for (let i = 0; i < 24; i++) {
        const x = (i * 7 + 3) % 32;
        const y = (i * 11 + 5) % 32;
        set(grid, x, y, i % 3 === 0 ? "#ffd319" : i % 3 === 1 ? "#00e5ff" : "#ffffff");
      }
      break;
    default:
      fillAll(grid, "#0a0a12");
  }
}

const BODY_COLORS: Record<string, [string, string]> = {
  "steel-grey": ["#9aa3ad", "#6b7280"],
  copper: ["#c47b4a", "#8a4f2a"],
  mint: ["#5fd3a3", "#2f7d5c"],
  cobalt: ["#3b82f6", "#1e3a8a"],
  crimson: ["#ef4444", "#7f1d1d"],
  gold: ["#ffd319", "#a16207"],
  "violet-neon": ["#a855f7", "#581c87"],
  obsidian: ["#1f2937", "#000000"],
};

function drawBody(grid: Grid, variant: string): void {
  const [main, panel] = BODY_COLORS[variant] ?? ["#9aa3ad", "#6b7280"];
  rect(grid, 10, 17, 12, 11, main);
  rect(grid, 13, 20, 6, 5, panel);
  rect(grid, 10, 17, 2, 2, "#e8e8f0");
  rect(grid, 20, 17, 2, 2, "#e8e8f0");
  if (variant === "obsidian") {
    rect(grid, 10, 27, 12, 1, "#00ff9c");
  }
  if (variant === "violet-neon") {
    rect(grid, 9, 19, 1, 6, "#ff2ec4");
    rect(grid, 22, 19, 1, 6, "#ff2ec4");
  }
}

const HEAD_COLORS: Record<string, string> = {
  square: "#cbd5e1",
  round: "#e2e8f0",
  visor: "#94a3b8",
  horned: "#f59e0b",
  crown: "#fbbf24",
  halo: "#fef3c7",
};

function drawHead(grid: Grid, variant: string): void {
  const main = HEAD_COLORS[variant] ?? "#cbd5e1";
  if (variant === "round") {
    for (let y = 5; y <= 15; y++) {
      for (let x = 9; x <= 22; x++) {
        const isCorner =
          (x === 9 && y === 5) ||
          (x === 22 && y === 5) ||
          (x === 9 && y === 15) ||
          (x === 22 && y === 15);
        if (!isCorner) set(grid, x, y, main);
      }
    }
  } else {
    rect(grid, 9, 5, 14, 11, main);
  }
  if (variant === "visor") {
    rect(grid, 9, 9, 14, 3, "#00e5ff");
  }
  if (variant === "horned") {
    rect(grid, 7, 3, 2, 3, "#e8e8f0");
    rect(grid, 23, 3, 2, 3, "#e8e8f0");
  }
  if (variant === "crown") {
    rect(grid, 11, 3, 2, 2, "#ffd319");
    rect(grid, 15, 2, 2, 3, "#ffd319");
    rect(grid, 19, 3, 2, 2, "#ffd319");
  }
  if (variant === "halo") {
    rect(grid, 13, 3, 6, 1, "#ffd319");
    rect(grid, 12, 4, 8, 1, "#ffd319");
  }
}

function drawEyes(grid: Grid, variant: string): void {
  const left: [number, number] = [12, 9];
  const right: [number, number] = [19, 9];
  switch (variant) {
    case "dot-blue":
      rect(grid, left[0], left[1], 2, 2, "#2563eb");
      rect(grid, right[0], right[1], 2, 2, "#2563eb");
      break;
    case "dot-green":
      rect(grid, left[0], left[1], 2, 2, "#00ff9c");
      rect(grid, right[0], right[1], 2, 2, "#00ff9c");
      break;
    case "dot-red":
      rect(grid, left[0], left[1], 2, 2, "#ef4444");
      rect(grid, right[0], right[1], 2, 2, "#ef4444");
      break;
    case "visor-cyan":
      rect(grid, 11, 9, 10, 2, "#00e5ff");
      break;
    case "visor-amber":
      rect(grid, 11, 9, 10, 2, "#f59e0b");
      break;
    case "x-eyes":
      for (const [x, y] of [[0, 0], [1, 1], [2, 2], [2, 0], [1, 1], [0, 2]]) {
        set(grid, left[0] + x - 0, left[1] + y, "#ff2ec4");
        set(grid, right[0] + x - 0, right[1] + y, "#ff2ec4");
      }
      break;
    case "star":
      for (const [x, y] of [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]]) {
        set(grid, left[0] + x - 1, left[1] + y, "#ffd319");
        set(grid, right[0] + x - 1, right[1] + y, "#ffd319");
      }
      break;
    default:
      rect(grid, left[0], left[1], 2, 2, "#2563eb");
      rect(grid, right[0], right[1], 2, 2, "#2563eb");
  }
}

function drawAntenna(grid: Grid, variant: string): void {
  switch (variant) {
    case "single":
      rect(grid, 15, 1, 2, 4, "#e8e8f0");
      set(grid, 15, 0, "#ef4444");
      set(grid, 16, 0, "#ef4444");
      break;
    case "double":
      rect(grid, 12, 2, 1, 3, "#e8e8f0");
      rect(grid, 19, 2, 1, 3, "#e8e8f0");
      set(grid, 12, 1, "#00e5ff");
      set(grid, 19, 1, "#00e5ff");
      break;
    case "dish":
      rect(grid, 15, 2, 2, 3, "#e8e8f0");
      rect(grid, 13, 0, 6, 2, "#94a3b8");
      break;
    case "lightning":
      set(grid, 16, 0, "#ffd319");
      set(grid, 15, 1, "#ffd319");
      set(grid, 16, 2, "#ffd319");
      set(grid, 17, 3, "#ffd319");
      set(grid, 16, 4, "#ffd319");
      break;
    case "orb":
      rect(grid, 15, 3, 2, 2, "#e8e8f0");
      rect(grid, 14, 0, 4, 3, "#00e5ff");
      set(grid, 15, 1, "#ffffff");
      set(grid, 16, 1, "#ffffff");
      break;
    default:
      rect(grid, 15, 1, 2, 4, "#e8e8f0");
  }
}

function drawAccessory(grid: Grid, variant: string): void {
  switch (variant) {
    case "scarf-red":
      rect(grid, 9, 16, 14, 1, "#ef4444");
      rect(grid, 20, 17, 2, 3, "#ef4444");
      break;
    case "headphones":
      rect(grid, 8, 9, 2, 5, "#111827");
      rect(grid, 22, 9, 2, 5, "#111827");
      rect(grid, 9, 4, 14, 1, "#111827");
      break;
    case "glasses":
      rect(grid, 11, 8, 4, 3, "#111827");
      rect(grid, 18, 8, 4, 3, "#111827");
      rect(grid, 15, 9, 3, 1, "#111827");
      set(grid, 12, 9, "#00e5ff");
      set(grid, 19, 9, "#00e5ff");
      break;
    case "chain":
      rect(grid, 12, 18, 8, 1, "#ffd319");
      rect(grid, 14, 19, 4, 1, "#ffd319");
      rect(grid, 15, 20, 2, 2, "#ffd319");
      break;
    case "cap":
      rect(grid, 9, 3, 14, 2, "#ef4444");
      rect(grid, 9, 5, 18, 1, "#ef4444");
      break;
    case "jetpack":
      rect(grid, 7, 18, 2, 9, "#64748b");
      rect(grid, 23, 18, 2, 9, "#64748b");
      rect(grid, 7, 28, 2, 1, "#f97316");
      rect(grid, 23, 28, 2, 1, "#f97316");
      break;
    case "wings":
      rect(grid, 5, 19, 4, 2, "#00e5ff");
      rect(grid, 4, 21, 5, 2, "#00e5ff");
      rect(grid, 23, 19, 4, 2, "#00e5ff");
      rect(grid, 23, 21, 5, 2, "#00e5ff");
      break;
    case "aura":
      rect(grid, 0, 0, 32, 1, "#ffd319");
      rect(grid, 0, 31, 32, 1, "#ffd319");
      rect(grid, 0, 0, 1, 32, "#ffd319");
      rect(grid, 31, 0, 1, 32, "#ffd319");
      break;
    default:
      break;
  }
}

export function renderPixelGrid(combo: Combination): Grid {
  const grid = createGrid("#0a0a12");
  drawBackground(grid, combo.background.variant);
  drawBody(grid, combo.body.variant);
  drawHead(grid, combo.head.variant);
  drawEyes(grid, combo.eyes.variant);
  drawAntenna(grid, combo.antenna.variant);
  drawAccessory(grid, combo.accessory.variant);
  return grid;
}

export function allTraitVariants(): TraitVariant[] {
  return LAYERS.flatMap((layer) => TRAITS[layer]);
}
