# BitBots

BitBots adalah web NFT off-chain. Koleksinya berisi 1.000 robot pixel art
32x32 yang di-upscale ke PNG 512x512. Kepemilikan, saldo, listing, dan
riwayat dicatat di database Supabase. Tidak ada smart contract, tidak ada
mint on-chain, dan saldo BITS adalah saldo demo internal untuk MVP.
1 BITS direncanakan setara 1 USDC di masa depan, tetapi konversi itu belum
dibangun.

## Stack

- Next.js 14.2.35 (App Router, TypeScript) + Tailwind CSS
- Supabase: Postgres, Auth (X/Twitter OAuth), Storage
- Generator: Node + pngjs (tanpa dependency native)
- Deploy target: Vercel (frontend + API routes), database tetap di Supabase

Catatan versi: Next.js 14.2.5 gagal build di Node 24 di VM ini karena
worker webpack mati dengan SIGBUS. Upgrade patch ke 14.2.35 memperbaiki
build tanpa mengubah API. Versi yang dipakai sekarang adalah 14.2.35.

## Struktur proyek

```
app/                    Halaman dan route auth callback
  page.tsx              Home, hero, tombol Mint, mint terbaru
  explore/page.tsx      Grid NFT yang sudah dimint + filter trait/rarity
  market/page.tsx       Listing aktif + beli/batal
  leaderboard/page.tsx  Holder terbanyak + NFT paling langka
  nft/[id]/page.tsx     Detail NFT, traits, riwayat, transfer, listing
  u/[username]/page.tsx Galeri milik user
  auth/callback/route.ts Exchange code Supabase Auth
components/             Komponen client, semua write lewat supabase.rpc
lib/
  pixel.ts              Definisi trait dan gambar robot 32x32 dari kode
  supabase/client.ts    Client browser (anon key saja)
  supabase/server.ts    Client server (anon key saja)
  types.ts              Tipe baris database dan helper tampilan
scripts/generate.ts     Generator 1.000 NFT, dry-run atau upload Supabase
supabase/migrations/    Migrasi SQL: tabel, RLS, trigger, RPC
```

## Cara setup Supabase

1. Buat proyek baru di Supabase. Catat Project URL dan anon key dari
   dashboard proyek. Jangan menempelkan key apa pun di chat atau di commit.
2. Buka SQL Editor di dashboard Supabase, lalu jalankan seluruh isi file
   `supabase/migrations/20261101000000_bitbots_init.sql` satu kali.
   File itu membuat 12 tabel, seed 40 trait, RLS, trigger signup, dan
   6 fungsi RPC. Urutan di dalam file sudah benar, jangan dipotong.
3. Buat bucket Storage bernama `nft-images` dengan akses baca publik.
   Upload hanya dilakukan oleh script generator dengan service role key.
   Client tidak pernah upload langsung.
4. Aktifkan provider X/Twitter di Authentication, Providers. Di Supabase,
   tambahkan redirect URL berikut:
   - `http://localhost:3000/auth/callback` untuk lokal
   - `https://domain-vercel-kamu/auth/callback` untuk production
   Di aplikasi X developer, callback URL yang sama harus didaftarkan.
5. Salin `.env.example` menjadi `.env.local`, lalu isi nilainya:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` hanya bila menjalankan generator mode
     Supabase. Key ini tidak pernah dipakai kode client.
6. Jalankan generator (lihat di bawah) untuk mengisi tabel `nfts`,
   lalu buka web dan login dengan X.

## Cara jalan lokal

```bash
npm install
cp .env.example .env.local
# isi .env.local dari dashboard Supabase, jangan commit file ini
npm run dev
# buka http://localhost:3000
```

Build production lokal:

```bash
npm run build
npm run start
```

Bila env Supabase belum diset, halaman tetap build dan tetap tampil,
tetapi menampilkan pesan bahwa Supabase belum diset, bukan crash.
Fitur login, mint, dan market baru berfungsi setelah env dan migrasi benar.

## Cara generate koleksi

Dry-run, tanpa Supabase, hanya menulis file lokal:

```bash
npm run generate -- --count 1000 --out out
```

Hasilnya: 1.000 PNG di `out/` dan `out/metadata.json`. Folder `out/`
sudah masuk `.gitignore`, jadi 1.000 PNG tidak ikut commit.

Mode Supabase, bila `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY`
diset di environment shell (bukan di file commit):

```bash
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
npm run generate -- --count 1000 --out out
```

Mode ini mengupload PNG ke bucket `nft-images` dengan path
`bitbots/BitBot-0001.png` dan seterusnya, lalu insert baris `nfts`,
upsert `traits`, dan insert `nft_traits`. Bucket harus sudah dibuat
dulu, kalau tidak upload gagal dengan pesan error yang jelas.

Cara generator bekerja:

- Setiap layer dipilih tier dulu dengan probabilitas Common 60 persen,
  Rare 25 persen, Epic 12 persen, Legendary 3 persen, lalu varian acak
  di dalam tier itu.
- Kombinasi enam layer di-hash. Bila kembar, generator mencoba lagi
  sampai mendapat 1.000 kombinasi unik.
- Rarity score adalah jumlah bobot tier: Common 10, Rare 25, Epic 50,
  Legendary 100. Tier NFT dari skor: 260 ke atas Legendary, 180 ke atas
  Epic, 110 ke atas Rare, sisanya Common.
- Grid 32x32 digambar murni dari kode di `lib/pixel.ts` (palet, kotak,
  dan pola kecil). Tidak ada gambar yang diunduh dari internet.
  PNG 512x512 dibuat dengan nearest-neighbor: tiap piksel 32x32 menjadi
  blok 16x16.

## Kontrak RPC

Semua write dari client memakai `supabase.rpc`. Tidak ada komponen
client yang memanggil insert, update, atau delete tabel langsung.
Semua fungsi di bawah adalah `security definer`, mengecek `auth.uid()`,
dan gagal dengan exception bila tidak sah. Pesan error itu yang
ditampilkan komponen sebagai pesan gagal.

| Fungsi | Input | Hasil dan cek utama |
| --- | --- | --- |
| `claim_mint()` | tidak ada | Ambil 1 NFT belum dimint dengan `FOR UPDATE SKIP LOCKED`, kunci baris profil, cek kuota lebih dari 0, kurangi kuota 1, tandai NFT minted, set owner, insert `mints` dan `transfers` dari NULL. Mengembalikan id NFT. |
| `redeem_promo(p_code)` | kode teks | Normalisasi kode ke huruf besar, kunci baris promo, cek ada, belum kedaluwarsa, `used_count` di bawah `max_uses`, dan user belum pernah redeem kode itu (unique user + kode). Tambah `free_mint_quota` sebesar `free_mints` di kode, secara atomik. |
| `transfer_nft(p_nft_id, p_to_username)` | id NFT, username tujuan | Cek owner sama dengan `auth.uid()`, format username valid, target ada dan bukan diri sendiri, NFT tidak sedang listing aktif. Pindah owner dan insert `transfers`. |
| `list_nft(p_nft_id, p_price)` | id NFT, harga | Cek owner, harga lebih dari 0, belum ada listing aktif (unique index aktif per NFT). Insert `listings`. |
| `cancel_listing(p_listing_id)` | id listing | Kunci listing, cek seller sama dengan `auth.uid()` dan listing masih aktif, lalu set `active` false. |
| `buy_nft(p_listing_id)` | id listing | Satu transaksi: kunci listing, saldo pembeli, saldo penjual, dan saldo treasury. Cek listing aktif, pembeli bukan penjual, saldo cukup. Kurangi pembeli sebesar harga, tambah penjual 97,5 persen, tambah treasury 2,5 persen. Catat `ledger` untuk ketiga pihak, set listing tidak aktif, pindah owner, insert `sales` dan `transfers`. |

Kuota free mint: profil baru dibuat dengan `free_mint_quota` 3.
`claim_mint` memakai kuota itu, bukan menghitung ulang dari tabel
`mints` sebagai batas keras. Kode promo menambah kuota, sehingga user
yang redeem kode sah bisa mint lebih dari 3 total. Ini sesuai desain
yang diminta: promo menambah kuota.

Trigger signup: saat baris baru dibuat di `auth.users`, trigger
`on_auth_user_created` membuat `profiles` (username dari metadata X
atau fallback `user_xxxxxxxx`), `balances` 100 BITS, dan satu baris
`ledger` tipe `signup_bonus` sebesar 100.

Treasury: UUID tetap `00000000-0000-0000-0000-000000000001`. Baris
`balances` treasury dibuat di migrasi. Kolom `balances.user_id` dan
`ledger.user_id` sengaja tidak memakai foreign key ke `profiles`,
supaya treasury bisa dicatat tanpa profil palsu.

## Keamanan

- RLS aktif di semua 12 tabel. Baca publik hanya untuk `profiles`,
  `traits`, `nfts`, `nft_traits`, `listings`, `sales`, dan `transfers`.
  `balances`, `ledger`, `mints`, dan `promo_redemptions` hanya bisa
  dibaca pemiliknya. `promo_codes` hanya bisa dibaca user yang login.
- Tidak ada policy insert, update, atau delete dari client untuk
  `balances`, `listings`, `sales`, `transfers`, dan kepemilikan NFT.
  Semua write lewat RPC yang mengecek `auth.uid()`.
- Service role key hanya ada di `scripts/generate.ts` dan dibaca dari
  environment. Grep membuktikan tidak ada string service role di
  `app/`, `components/`, atau `lib/`.
- Validasi di batas input: harga dicek finite dan lebih dari 0 di
  client dan di RPC, username transfer dicek pola huruf, angka, dan
  garis bawah 3 sampai 32 karakter di client dan di RPC, kode promo
  di-trim dan dinormalisasi di RPC.
- Callback auth hanya mengizinkan redirect ke path internal yang diawali
  satu garis miring, menolak `//`, backslash, byte kontrol, dan
  `%2f`/`%5c` yang bisa dipakai untuk open redirect.
- Gambar NFT hanya dirender bila URL diawali `https://`. React
  melakukan escape otomatis untuk semua teks dari database, dan kode
  tidak memakai `dangerouslySetInnerHTML` atau `innerHTML`.
- Header keamanan diset di `next.config.mjs`: `X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, dan CSP
  yang mengizinkan font Google, gambar HTTPS, dan koneksi Supabase.
  Header ini perlu dicek ulang di deployment nyata dengan `curl -I`,
  karena konfigurasi saja bukan bukti runtime.
- Hal yang belum diterapkan sebagai pembatas server: rate limit untuk
  login dan RPC. Supabase Auth dan Postgres membatasi secara default
  di sisi platform, tetapi tidak ada rate limiter khusus di aplikasi
  ini. Itu dicatat sebagai pekerjaan lanjutan, bukan sebagai fitur
  yang diklaim ada.

## Deploy ke Vercel (persiapan, belum dilakukan)

Repo GitHub target adalah `bitbots` milik user. Repo itu belum dibuat
dan kode ini belum di-push, sesuai instruksi kerja lokal saja.

Langkah user nanti:

1. Buat repo `bitbots` di GitHub, lalu dari folder proyek:
   `git remote add origin <url-repo>` dan push branch utama.
   Perintah push tidak dijalankan di sini.
2. Di Vercel, import repo `bitbots`. Framework terdeteksi Next.js.
3. Set environment variables di Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   Jangan set service role key di Vercel kecuali ada proses generate
   yang memang berjalan di sana. Untuk MVP, generate dijalankan lokal.
4. Deploy. Perintah CLI setara, setelah login di browser oleh user:
   `vercel login`, lalu dari folder proyek `vercel link` (periksa
   proyek yang terpilih sebelum lanjut), lalu `vercel --prod`.
   Jangan membiarkan CLI memilih proyek otomatis tanpa verifikasi.
5. Setelah deploy, tambahkan URL callback production ke Supabase Auth
   dan ke aplikasi X, lalu cek halaman utama, explore, market, dan
   leaderboard mengembalikan 200.

## Yang belum dibangun (sengaja)

- Deposit dan withdraw USDC/USDT Solana ke alamat deposit per user.
  Belum ada kode wallet, alamat deposit, atau transaksi Solana.
- MCP connector untuk Claude/ChatGPT. Belum ada server MCP, tool,
  atau skema tool.
- Rate limiter khusus aplikasi, seperti ditulis di bagian keamanan.
- Halaman admin, edit profil, dan upload gambar oleh user.

Dua item pertama hanya dicatat di sini sebagai rencana, bukan sebagai
fitur. Tidak ada stub yang berpura-pura menjadi fitur itu.

## Troubleshooting

- Halaman menampilkan "Supabase belum diset": isi `.env.local` dan
  restart dev server. Build tidak membutuhkan env itu untuk lolos.
- Login X gagal redirect: periksa callback URL di Supabase Auth dan
  di aplikasi X sama persis dengan domain yang dipakai.
- Generator mode Supabase gagal upload: pastikan bucket `nft-images`
  sudah dibuat. Generator tidak membuat bucket otomatis.
- Build Next 14.2.5 mati diam-diam di Node 24: pakai versi di
  `package.json` sekarang, yaitu 14.2.35, yang sudah terverifikasi
  di VM ini.
