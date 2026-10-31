-- BitBots initial migration.
-- Run this file in the Supabase SQL editor, in order, once.
-- It creates tables, seeds traits, enables RLS, creates the signup
-- trigger, and creates the RPC functions used by the client.
-- All client writes go through RPC functions. There is intentionally
-- no insert/update/delete policy for balances, listings, sales,
-- transfers, or NFT ownership, so those tables cannot be written
-- directly from the client.

-- Treasury pseudo-user. It is not a real profile; balances and ledger
-- use plain uuid columns so this row can exist without a profile row.
-- Treasury UUID: 00000000-0000-0000-0000-000000000001

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  display_name text,
  free_mint_quota integer not null default 3 check (free_mint_quota >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.traits (
  id uuid primary key default gen_random_uuid(),
  layer text not null,
  variant text not null,
  name text not null,
  rarity_tier text not null check (rarity_tier in ('Common', 'Rare', 'Epic', 'Legendary')),
  unique (layer, variant)
);

create table if not exists public.nfts (
  id uuid primary key default gen_random_uuid(),
  token_number integer not null unique,
  name text not null,
  image_url text,
  rarity_score numeric not null default 0,
  rarity_tier text not null default 'Common' check (rarity_tier in ('Common', 'Rare', 'Epic', 'Legendary')),
  owner_id uuid references public.profiles (id) on delete set null,
  minted_at timestamptz,
  is_minted boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.nft_traits (
  nft_id uuid not null references public.nfts (id) on delete cascade,
  trait_id uuid not null references public.traits (id) on delete cascade,
  primary key (nft_id, trait_id)
);

create table if not exists public.mints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  nft_id uuid not null unique references public.nfts (id) on delete cascade,
  mint_type text not null default 'free',
  minted_at timestamptz not null default now()
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  nft_id uuid not null references public.nfts (id) on delete cascade,
  seller_id uuid not null references public.profiles (id) on delete cascade,
  price_bits numeric(20, 2) not null check (price_bits > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists listings_one_active_per_nft
  on public.listings (nft_id) where active;

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  nft_id uuid not null references public.nfts (id) on delete cascade,
  seller_id uuid not null references public.profiles (id) on delete cascade,
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid references public.listings (id) on delete set null,
  price_bits numeric(20, 2) not null check (price_bits > 0),
  fee_bits numeric(20, 2) not null default 0 check (fee_bits >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.transfers (
  id uuid primary key default gen_random_uuid(),
  nft_id uuid not null references public.nfts (id) on delete cascade,
  from_id uuid,
  to_id uuid not null,
  type text not null default 'transfer' check (type in ('mint', 'transfer', 'sale')),
  created_at timestamptz not null default now()
);

create table if not exists public.balances (
  user_id uuid primary key,
  amount_bits numeric(20, 2) not null default 0 check (amount_bits >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  change numeric(20, 2) not null,
  type text not null,
  ref_id uuid,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  max_uses integer not null check (max_uses > 0),
  used_count integer not null default 0 check (used_count >= 0),
  expires_at timestamptz,
  free_mints integer not null default 1 check (free_mints > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  promo_code_id uuid not null references public.promo_codes (id) on delete cascade,
  used_at timestamptz not null default now(),
  unique (user_id, promo_code_id)
);

-- Seed traits. These layer/variant pairs must match lib/pixel.ts.
insert into public.traits (layer, variant, name, rarity_tier) values
  ('background', 'void-black', 'Void Black', 'Common'),
  ('background', 'teal-grid', 'Teal Grid', 'Common'),
  ('background', 'purple-dusk', 'Purple Dusk', 'Common'),
  ('background', 'circuit', 'Circuit Board', 'Rare'),
  ('background', 'neon-city', 'Neon City', 'Epic'),
  ('background', 'galaxy', 'Galaxy', 'Legendary'),
  ('body', 'steel-grey', 'Steel Grey', 'Common'),
  ('body', 'copper', 'Copper', 'Common'),
  ('body', 'mint', 'Mint', 'Common'),
  ('body', 'cobalt', 'Cobalt', 'Rare'),
  ('body', 'crimson', 'Crimson', 'Rare'),
  ('body', 'gold', 'Gold', 'Epic'),
  ('body', 'violet-neon', 'Violet Neon', 'Epic'),
  ('body', 'obsidian', 'Obsidian', 'Legendary'),
  ('head', 'square', 'Square Head', 'Common'),
  ('head', 'round', 'Round Head', 'Common'),
  ('head', 'visor', 'Visor Head', 'Rare'),
  ('head', 'horned', 'Horned Head', 'Rare'),
  ('head', 'crown', 'Crown Head', 'Epic'),
  ('head', 'halo', 'Halo Head', 'Legendary'),
  ('eyes', 'dot-blue', 'Blue Dots', 'Common'),
  ('eyes', 'dot-green', 'Green Dots', 'Common'),
  ('eyes', 'dot-red', 'Red Dots', 'Common'),
  ('eyes', 'visor-cyan', 'Cyan Visor', 'Rare'),
  ('eyes', 'visor-amber', 'Amber Visor', 'Rare'),
  ('eyes', 'x-eyes', 'X Eyes', 'Epic'),
  ('eyes', 'star', 'Star Eyes', 'Legendary'),
  ('antenna', 'single', 'Single Antenna', 'Common'),
  ('antenna', 'double', 'Double Antenna', 'Common'),
  ('antenna', 'dish', 'Dish Antenna', 'Rare'),
  ('antenna', 'lightning', 'Lightning Antenna', 'Epic'),
  ('antenna', 'orb', 'Orb Antenna', 'Legendary'),
  ('accessory', 'scarf-red', 'Red Scarf', 'Common'),
  ('accessory', 'headphones', 'Headphones', 'Common'),
  ('accessory', 'glasses', 'Glasses', 'Common'),
  ('accessory', 'chain', 'Gold Chain', 'Rare'),
  ('accessory', 'cap', 'Arcade Cap', 'Rare'),
  ('accessory', 'jetpack', 'Jetpack', 'Epic'),
  ('accessory', 'wings', 'Neon Wings', 'Epic'),
  ('accessory', 'aura', 'Golden Aura', 'Legendary')
on conflict (layer, variant) do nothing;

insert into public.balances (user_id, amount_bits)
values ('00000000-0000-0000-0000-000000000001', 0)
on conflict (user_id) do nothing;

-- Row Level Security: enabled on every table.
alter table public.profiles enable row level security;
alter table public.traits enable row level security;
alter table public.nfts enable row level security;
alter table public.nft_traits enable row level security;
alter table public.mints enable row level security;
alter table public.listings enable row level security;
alter table public.sales enable row level security;
alter table public.transfers enable row level security;
alter table public.balances enable row level security;
alter table public.ledger enable row level security;
alter table public.promo_codes enable row level security;
alter table public.promo_redemptions enable row level security;

-- Public reads.
create policy "profiles are publicly readable" on public.profiles for select using (true);
create policy "traits are publicly readable" on public.traits for select using (true);
create policy "nfts are publicly readable" on public.nfts for select using (true);
create policy "nft_traits are publicly readable" on public.nft_traits for select using (true);
create policy "listings are publicly readable" on public.listings for select using (true);
create policy "sales are publicly readable" on public.sales for select using (true);
create policy "transfers are publicly readable" on public.transfers for select using (true);

-- Own-data reads only.
create policy "mints are readable by owner" on public.mints for select using (auth.uid() = user_id);
create policy "balances are readable by owner" on public.balances for select using (auth.uid() = user_id);
create policy "ledger is readable by owner" on public.ledger for select using (auth.uid() = user_id);
create policy "promo_redemptions are readable by owner" on public.promo_redemptions for select using (auth.uid() = user_id);

-- Promo codes are readable by signed-in users only.
create policy "promo_codes are readable by signed-in users" on public.promo_codes for select to authenticated using (true);

-- No insert/update/delete policies are created for balances, listings,
-- sales, transfers, or NFT ownership. Writes to those tables happen only
-- inside the security definer RPC functions below, which check auth.uid().

-- Signup trigger: profile + 100 BITS + signup ledger row.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
begin
  v_username := lower(regexp_replace(
    coalesce(
      new.raw_user_meta_data ->> 'preferred_username',
      new.raw_user_meta_data ->> 'user_name',
      new.raw_user_meta_data ->> 'name',
      'user_' || substr(new.id::text, 1, 8)
    ),
    '[^a-z0-9_]', '_', 'g'
  ));
  if v_username is null or v_username = '' then
    v_username := 'user_' || substr(new.id::text, 1, 8);
  end if;
  if exists (select 1 from public.profiles where username = v_username) then
    v_username := v_username || '_' || substr(new.id::text, 1, 8);
  end if;

  insert into public.profiles (id, username, display_name, free_mint_quota)
  values (new.id, v_username, coalesce(new.raw_user_meta_data ->> 'name', v_username), 3)
  on conflict (id) do nothing;

  insert into public.balances (user_id, amount_bits)
  values (new.id, 100)
  on conflict (user_id) do nothing;

  insert into public.ledger (user_id, change, type, note)
  values (new.id, 100, 'signup_bonus', 'Bonus saldo awal 100 BITS');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RPC: claim one free mint. Row lock with SKIP LOCKED prevents two
-- concurrent calls from picking the same NFT. Quota is locked and
-- decremented in the same transaction.
create or replace function public.claim_mint()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_quota integer;
  v_nft uuid;
begin
  v_user := auth.uid();
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  select free_mint_quota into v_quota
  from public.profiles where id = v_user for update;
  if not found then
    raise exception 'profile not found';
  end if;
  if v_quota <= 0 then
    raise exception 'free mint quota habis';
  end if;

  select id into v_nft
  from public.nfts
  where is_minted = false
  order by random()
  limit 1
  for update skip locked;
  if v_nft is null then
    raise exception 'tidak ada NFT yang tersedia';
  end if;

  update public.nfts
  set is_minted = true, owner_id = v_user, minted_at = now()
  where id = v_nft;

  update public.profiles
  set free_mint_quota = v_quota - 1
  where id = v_user;

  insert into public.mints (user_id, nft_id, mint_type)
  values (v_user, v_nft, 'free');

  insert into public.transfers (nft_id, from_id, to_id, type)
  values (v_nft, null, v_user, 'mint');

  return v_nft;
end;
$$;

-- RPC: redeem one promo code. The promo row is locked, the per-user
-- redemption is unique, and the quota increase happens atomically.
create or replace function public.redeem_promo(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_promo_id uuid;
  v_max_uses integer;
  v_used_count integer;
  v_expires timestamptz;
  v_free_mints integer;
  v_code text;
begin
  v_user := auth.uid();
  if v_user is null then
    raise exception 'not authenticated';
  end if;
  v_code := upper(btrim(coalesce(p_code, '')));
  if v_code = '' then
    raise exception 'kode promo kosong';
  end if;

  select id, max_uses, used_count, expires_at, free_mints
  into v_promo_id, v_max_uses, v_used_count, v_expires, v_free_mints
  from public.promo_codes where code = v_code for update;
  if not found then
    raise exception 'kode promo tidak ditemukan';
  end if;
  if v_expires is not null and v_expires < now() then
    raise exception 'kode promo sudah kedaluwarsa';
  end if;
  if v_used_count >= v_max_uses then
    raise exception 'kode promo sudah habis dipakai';
  end if;
  if exists (
    select 1 from public.promo_redemptions
    where user_id = v_user and promo_code_id = v_promo_id
  ) then
    raise exception 'kode promo sudah pernah dipakai user ini';
  end if;

  insert into public.promo_redemptions (user_id, promo_code_id)
  values (v_user, v_promo_id);

  update public.promo_codes
  set used_count = used_count + 1
  where id = v_promo_id;

  update public.profiles
  set free_mint_quota = free_mint_quota + v_free_mints
  where id = v_user;
  if not found then
    raise exception 'profile not found';
  end if;

  return true;
end;
$$;

-- RPC: transfer an NFT to another username.
create or replace function public.transfer_nft(p_nft_id uuid, p_to_username text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_owner uuid;
  v_target uuid;
  v_target_name text;
begin
  v_user := auth.uid();
  if v_user is null then
    raise exception 'not authenticated';
  end if;
  v_target_name := btrim(coalesce(p_to_username, ''));
  if v_target_name !~ '^[A-Za-z0-9_]{3,32}$' then
    raise exception 'username tujuan tidak valid';
  end if;

  select owner_id into v_owner
  from public.nfts where id = p_nft_id for update;
  if not found then
    raise exception 'NFT tidak ditemukan';
  end if;
  if v_owner is distinct from v_user then
    raise exception 'bukan pemilik NFT ini';
  end if;
  if exists (
    select 1 from public.listings
    where nft_id = p_nft_id and active = true
  ) then
    raise exception 'NFT sedang listing aktif, batalkan dulu';
  end if;

  select id into v_target
  from public.profiles where username = v_target_name;
  if not found then
    raise exception 'username tujuan tidak ditemukan';
  end if;
  if v_target = v_user then
    raise exception 'tidak bisa transfer ke diri sendiri';
  end if;

  update public.nfts set owner_id = v_target where id = p_nft_id;

  insert into public.transfers (nft_id, from_id, to_id, type)
  values (p_nft_id, v_user, v_target, 'transfer');

  return true;
end;
$$;

-- RPC: list an NFT for sale.
create or replace function public.list_nft(p_nft_id uuid, p_price numeric)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_owner uuid;
  v_listing uuid;
begin
  v_user := auth.uid();
  if v_user is null then
    raise exception 'not authenticated';
  end if;
  if p_price is null or p_price <= 0 then
    raise exception 'harga harus lebih dari 0';
  end if;

  select owner_id into v_owner
  from public.nfts where id = p_nft_id for update;
  if not found then
    raise exception 'NFT tidak ditemukan';
  end if;
  if v_owner is distinct from v_user then
    raise exception 'bukan pemilik NFT ini';
  end if;
  if exists (
    select 1 from public.listings
    where nft_id = p_nft_id and active = true
  ) then
    raise exception 'NFT sudah punya listing aktif';
  end if;

  insert into public.listings (nft_id, seller_id, price_bits, active)
  values (p_nft_id, v_user, p_price, true)
  returning id into v_listing;

  return v_listing;
end;
$$;

-- RPC: cancel a listing.
create or replace function public.cancel_listing(p_listing_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
  v_seller uuid;
  v_active boolean;
begin
  v_user := auth.uid();
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  select seller_id, active into v_seller, v_active
  from public.listings where id = p_listing_id for update;
  if not found then
    raise exception 'listing tidak ditemukan';
  end if;
  if v_seller is distinct from v_user then
    raise exception 'bukan penjual listing ini';
  end if;
  if not v_active then
    raise exception 'listing sudah tidak aktif';
  end if;

  update public.listings set active = false where id = p_listing_id;
  return true;
end;
$$;

-- RPC: buy a listing. One transaction locks the listing, buyer balance,
-- seller balance, and treasury balance, then moves money and ownership
-- together. Seller receives 97.5 percent, treasury receives the rest.
create or replace function public.buy_nft(p_listing_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer uuid;
  v_seller uuid;
  v_nft uuid;
  v_price numeric(20, 2);
  v_active boolean;
  v_buyer_balance numeric(20, 2);
  v_seller_balance numeric(20, 2);
  v_treasury_balance numeric(20, 2);
  v_seller_amount numeric(20, 2);
  v_fee numeric(20, 2);
  v_treasury uuid := '00000000-0000-0000-0000-000000000001';
begin
  v_buyer := auth.uid();
  if v_buyer is null then
    raise exception 'not authenticated';
  end if;

  select nft_id, seller_id, price_bits, active
  into v_nft, v_seller, v_price, v_active
  from public.listings where id = p_listing_id for update;
  if not found then
    raise exception 'listing tidak ditemukan';
  end if;
  if not v_active then
    raise exception 'listing sudah tidak aktif';
  end if;
  if v_seller = v_buyer then
    raise exception 'tidak bisa membeli NFT sendiri';
  end if;

  select amount_bits into v_buyer_balance
  from public.balances where user_id = v_buyer for update;
  if not found then
    raise exception 'saldo pembeli tidak ditemukan';
  end if;
  if v_buyer_balance < v_price then
    raise exception 'saldo tidak cukup';
  end if;

  select amount_bits into v_seller_balance
  from public.balances where user_id = v_seller for update;
  if not found then
    insert into public.balances (user_id, amount_bits) values (v_seller, 0);
    v_seller_balance := 0;
  end if;

  select amount_bits into v_treasury_balance
  from public.balances where user_id = v_treasury for update;
  if not found then
    insert into public.balances (user_id, amount_bits) values (v_treasury, 0);
    v_treasury_balance := 0;
  end if;

  v_seller_amount := round(v_price * 0.975, 2);
  v_fee := round(v_price - v_seller_amount, 2);

  update public.balances set amount_bits = v_buyer_balance - v_price, updated_at = now() where user_id = v_buyer;
  update public.balances set amount_bits = v_seller_balance + v_seller_amount, updated_at = now() where user_id = v_seller;
  update public.balances set amount_bits = v_treasury_balance + v_fee, updated_at = now() where user_id = v_treasury;

  update public.listings set active = false where id = p_listing_id;
  update public.nfts set owner_id = v_buyer where id = v_nft;

  insert into public.sales (nft_id, seller_id, buyer_id, listing_id, price_bits, fee_bits)
  values (v_nft, v_seller, v_buyer, p_listing_id, v_price, v_fee);

  insert into public.transfers (nft_id, from_id, to_id, type)
  values (v_nft, v_seller, v_buyer, 'sale');

  insert into public.ledger (user_id, change, type, ref_id, note)
  values (v_buyer, -v_price, 'purchase', p_listing_id, 'Pembelian NFT');
  insert into public.ledger (user_id, change, type, ref_id, note)
  values (v_seller, v_seller_amount, 'sale', p_listing_id, 'Penjualan NFT setelah fee');
  insert into public.ledger (user_id, change, type, ref_id, note)
  values (v_treasury, v_fee, 'fee', p_listing_id, 'Fee market 2,5 persen');

  return true;
end;
$$;

grant execute on function public.claim_mint() to authenticated;
grant execute on function public.redeem_promo(text) to authenticated;
grant execute on function public.transfer_nft(uuid, text) to authenticated;
grant execute on function public.list_nft(uuid, numeric) to authenticated;
grant execute on function public.cancel_listing(uuid) to authenticated;
grant execute on function public.buy_nft(uuid) to authenticated;
