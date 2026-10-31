# STATUS BitBots MVP

Tanggal pengerjaan: 1 November 2026 (WIB).
Lokasi proyek: `~/workspace/bitbots`.
Status: MVP lokal selesai dan build lolos. Belum deploy, belum push,
belum ada akun Supabase, Vercel, atau GitHub yang dibuat.

## Ringkasan hasil

- `npm install`: lolos.
- `npx tsc --noEmit`: bersih, tanpa error.
- `npm run build`: lolos. Rute yang dihasilkan ada di tabel build di bawah.
- Generator dry-run 1.000 NFT: lolos semua cek di bawah.
- Server production lokal (`npm run start` setelah build): halaman utama,
  explore, market, dan leaderboard mengembalikan HTTP 200.
- Tidak ada API key, service role key, password, atau token di chat
  maupun di file yang di-commit. `.env.example` hanya berisi placeholder.

## Fitur yang sudah dibuat

| Fitur dari spesifikasi | Status | Bukti |
| --- | --- | --- |
| Login X via Supabase Auth + callback | Kode selesai, belum dites live | `components/Header.tsx` memanggil `signInWithOAuth` provider `twitter`, `app/auth/callback/route.ts` exchange code dengan sanitasi redirect |
| Generator pixel art 32x32 ke PNG 512x512 | Selesai dan dites dry-run | `lib/pixel.ts`, `scripts/generate.ts`, 1.000 PNG di `out/` |
| 6 layer, tiap layer 5 sampai 8 varian dari kode | Selesai | background 6, body 8, head 6, eyes 7, antenna 5, accessory 8, total 40 trait |
| Pemilihan tier 60/25/12/3 lalu varian acak dalam tier | Selesai | `pickTrait` di `lib/pixel.ts` |
| Script generate 1.000 kombinasi unik + upload Storage + insert DB | Selesai, mode dry-run dites, mode Supabase belum dites | `scripts/generate.ts` via `npm run generate` |
| Mint dengan `FOR UPDATE SKIP LOCKED`, batas kuota awal 3 | Kode selesai, belum dites live | RPC `claim_mint` di migrasi |
| Kode promo, satu user satu kode sekali | Kode selesai, belum dites live | RPC `redeem_promo`, unique user + kode, kunci baris promo |
| Profil/galeri `/u/[username]` dan detail `/nft/[id]` | Selesai, halaman tampil tanpa env | `app/u/[username]/page.tsx`, `app/nft/[id]/page.tsx` |
| Explore dengan filter trait dan rarity | Selesai | `app/explore/page.tsx` |
| Transfer ke username lain dengan konfirmasi | Selesai, belum dites live | `components/TransferForm.tsx` + RPC `transfer_nft` |
| Market: list, batal, beli, fee 2,5 persen ke treasury, saldo atomik | Kode selesai, belum dites live | `app/market/page.tsx`, RPC `list_nft`, `cancel_listing`, `buy_nft` |
| Saldo awal 100 BITS + ledger signup | Kode selesai, belum dites live | Trigger `handle_new_user` di migrasi |
| Leaderboard holder dan NFT paling langka | Selesai | `app/leaderboard/page.tsx` |
| RLS di semua tabel, write hanya lewat RPC | Kode selesai, belum dites live di Supabase | Migrasi, tidak ada policy write client untuk tabel sensitif |
| Halaman tahan env belum diset tanpa crash build | Selesai dan dites | Build lolos tanpa `.env.local`, halaman menampilkan `EnvNotice` |
| `.env.example`, `.gitignore`, README | Selesai | `out/`, `node_modules/`, `.env.local` masuk `.gitignore` |

## Hasil build

Perintah: `npm run build` setelah `rm -rf .next`, Next.js 14.2.35.

```
Route (app)                              Size     First Load JS
/                                        1.23 kB         166 kB
/_not-found                              873 B          88.2 kB
/auth/callback                           0 B                0 B
/explore                                 180 B          96.2 kB
/leaderboard                             180 B          96.2 kB
/market                                  810 B           166 kB
/nft/[id]                                1.47 kB         166 kB
/robots.txt                              0 B                0 B
/sitemap.xml                             0 B                0 B
/u/[username]                            180 B          96.2 kB
```

Semua halaman data ditandai dynamic (simbol ƒ), kecuali robots dan
sitemap yang statis. Itu disengaja, karena halaman data membaca
Supabase saat request, bukan saat build.

## Hasil tes generator

Perintah: `npm run generate -- --count 1000 --out out` dalam mode
dry-run, tanpa env Supabase.

- File PNG yang dihasilkan: tepat 1.000, dari `BitBot-0001.png`
  sampai `BitBot-1000.png`, plus `out/metadata.json`.
- Kombinasi unik: 1.000 dari 1.000, hash kombinasi unik 1.000 dari 1.000.
  Generator mencoba 1.021 kombinasi untuk mendapat 1.000 yang unik.
- Ukuran PNG: 512x512 untuk 50 file pertama yang diperiksa penuh
  dengan pngjs, dan header magic PNG benar untuk 1.000 dari 1.000 file.
- Distribusi rarity NFT: Common 410, Rare 443, Epic 136, Legendary 11.
  Distribusi ini masuk akal untuk ambang skor yang dipakai: Legendary
  butuh skor 260 ke atas, sehingga hanya kombinasi dengan banyak trait
  Epic dan Legendary yang lolos ke tier itu.
- Folder `out/` berukuran 5,1 MB, sudah masuk `.gitignore`, dan tidak
  ikut commit. Ringkasan ini yang disimpan, bukan 1.000 PNG-nya.

## Hasil tes server lokal

Setelah build, server dijalankan dengan `npm run start` di port 3100,
lalu dicek dengan curl:

- `/`: HTTP 200, isi memuat kata BITBOTS dan headline utama.
- `/explore`: HTTP 200.
- `/market`: HTTP 200.
- `/leaderboard`: HTTP 200.

Halaman-halaman itu tampil dengan pesan Supabase belum diset, karena
`.env.local` memang tidak dibuat dalam pengerjaan lokal ini. Itu adalah
perilaku yang dirancang, bukan kegagalan data.

## Hasil cek keamanan kode

- Grep `SERVICE_ROLE` di `app/`, `components/`, dan `lib/`: tidak ada.
  Service role hanya dibaca dari environment di `scripts/generate.ts`.
- Grep `dangerouslySetInnerHTML`, `innerHTML`, dan `eval(` di `app/`,
  `components/`, `lib/`, dan `scripts/`: tidak ada.
- Grep `.from(` di `components/`: tidak ada. Semua aksi client memakai
  `supabase.rpc`: `claim_mint`, `redeem_promo`, `transfer_nft`,
  `list_nft`, `cancel_listing`, `buy_nft`.
- `npm audit --omit=dev` tidak bisa dijalankan di VM ini karena endpoint
  audit registry diblokir kebijakan internal (HTTP 403). Hasil audit
  dependensi karena itu tidak terverifikasi, dan tidak ada klaim bahwa
  dependensi bebas kerentanan. Dependensi yang dipakai tetap minimal:
  Next, React, Supabase, pngjs, Tailwind, dan tooling build.

## Masalah yang ditemukan dan diperbaiki

- Next.js 14.2.5 gagal build di Node 24.22.1 di VM ini. Proses berhenti
  diam-diam setelah baris "Creating an optimized production build".
  Dengan `DEBUG=next:*`, penyebabnya terlihat: worker webpack mati
  dengan SIGBUS. Upgrade patch ke Next.js 14.2.35 memperbaiki build
  tanpa mengubah API dan tanpa flag eksperimental. `package.json`
  sekarang memakai `^14.2.35`.
- Error TypeScript awal pada tipe cookie Supabase dan field trait di
  halaman detail diperbaiki sebelum build, dan `tsc --noEmit` bersih.

## Yang BELUM terverifikasi (butuh login user)

Item di bawah ini belum dites karena tidak ada akun Supabase, Vercel,
atau GitHub yang dibuat dalam tugas ini, sesuai instruksi kerja lokal.
Jangan menganggap item ini jalan sampai dites dengan akun nyata:

- Eksekusi migrasi di Supabase SQL editor, termasuk trigger di
  `auth.users` dan pembuatan bucket `nft-images`.
- Login X/Twitter OAuth end-to-end dan pembuatan profil otomatis.
- RPC live: mint dua kali bersamaan tidak mendapat NFT yang sama,
  mint keempat tanpa kuota gagal, redeem kode yang sama dua kali gagal,
  transfer ke username yang tidak ada gagal, beli tanpa saldo gagal,
  dan fee 2,5 persen masuk treasury.
- Generator mode Supabase: upload ke Storage dan insert `nfts`,
  `traits`, dan `nft_traits`.
- Deploy Vercel dan callback URL production.
- Pembuatan repo GitHub `bitbots` dan push kode.

Langkah verifikasi berikutnya, setelah user membuat proyek Supabase:
jalankan migrasi, buat bucket, isi `.env.local`, jalankan generator
mode Supabase, login dengan X, lalu uji mint, promo, transfer, list,
dan beli satu per satu sesuai daftar di atas.

## Yang sengaja tidak dibangun

- Deposit dan withdraw USDC/USDT Solana.
- MCP connector untuk Claude/ChatGPT.
- Rate limiter khusus aplikasi.
- Halaman admin dan edit profil.

Keempatnya hanya dicatat di README sebagai rencana, tanpa stub kode
yang berpura-pura menjadi fitur.

## Skill yang diterapkan

Inventarisasi singkat: ada 102 skill custom di `~/workspace/custom-skills/`
dan 56 skill sistem di `/opt/muse/skills/`. Tabel di bawah hanya
mencakup skill yang dibaca dan diterapkan, plus skill lain yang sengaja
tidak diterapkan. Tidak semua 158 skill dicantumkan satu per satu,
karena sebagian besar tidak berhubungan dengan web NFT ini. Yang tidak
dicantumkan mengikuti alasan yang sama dengan baris kelompoknya.

| Skill | Diterapkan sebagai | Bukti di kode |
| --- | --- | --- |
| taste-frontend | Prinsipnya saja: satu h1 jelas per halaman, heading tiap section, margin sama, tanpa gradient, tanpa kartu ikon seragam, satu aksi utama di hero. Aturan "tanpa monospace" tidak dipakai, karena brief menetapkan tema pixel dan font pixel. Tidak ada diagram atau screenshot inspector yang dijalankan, karena tidak ada browser live di subagent ini. | `app/page.tsx`, `app/globals.css`, `tailwind.config.ts` |
| frontend-design | Satu elemen yang diingat (robot pixel dan headline), copy dalam bahasa sederhana, CTA bernama sesuai aksi, empty state memberi arah, bukan sekadar "kosong". | `app/page.tsx`, halaman explore, market, leaderboard, detail |
| emil-design-eng | Tombol terasa ditekan: transisi hanya transform dan border, 160ms ease-out custom, active scale 0.97, hover tidak diandalkan di sentuh, reduced motion memangkas durasi. Tidak ada animasi masuk yang memblokir interaksi. | `app/globals.css` |
| archify | Prinsipnya saja: arsitektur ditulis sebagai struktur dan tabel kontrak di README, bukan sebagai file HTML diagram terpisah. Membuat diagram HTML terpisah akan menambah artefak di luar stack Next yang ditetapkan. | `README.md` bagian struktur dan kontrak RPC |
| api-and-interface-design | Kontrak RPC ditulis dulu sebagai tabel, input dan output konsisten, validasi di batas (client dan RPC), keunikan sebagai pengaman race (unique listing aktif, unique redeem per user, SKIP LOCKED untuk mint dan beli). Tidak ada endpoint REST baru yang dibuat, karena semua aksi lewat RPC Supabase dan satu route callback auth. | `README.md`, migrasi, komponen di `components/` |
| code-review-and-quality | Self-review lima sumbu sebelum build: kebenaran (tsc dan build), keterbacaan (nama jelas, tanpa `any` liar), arsitektur (server vs client terpisah), keamanan (lihat tabel keamanan), performa (limit query, tanpa N+1 di halaman utama). File terbesar adalah migrasi 600 baris dan `lib/pixel.ts` 417 baris, keduanya masih di bawah batas inspeksi 1.000 baris. | Seluruh repo, hasil tsc dan build di atas |
| antislop-code | Komentar hanya yang menambah informasi yang tidak terlihat dari kode, satu baris atau dua baris bila fakta kedua benar-benar baru, tanpa banner dekoratif, tanpa narasi langkah, tanpa emoji. | `lib/pixel.ts`, `lib/supabase/server.ts`, migrasi |
| minimal-code | Tidak ada fitur spekulatif, tidak ada dependency baru di luar yang dibutuhkan, tidak ada abstraksi untuk satu pemakaian. Solana dan MCP tidak dibuatkan stub. | `package.json`, `README.md` |
| git-workflow-and-versioning | Prinsipnya: `.gitignore` sejak awal, cek secret sebelum commit, commit atomik per lapisan saat repo dibuat. Repo git tidak di-commit dalam pengerjaan ini, karena tidak ada identitas git yang terkonfigurasi di VM dan push memang di luar instruksi. User membuat repo `bitbots`, lalu commit dengan identitasnya sendiri. | `.gitignore` |
| security-and-hardening | Ancaman dipetakan dulu: saldo, kepemilikan, dan listing adalah aset. Kontrol: RLS, RPC security definer dengan cek `auth.uid()`, kunci baris, validasi batas, header keamanan, secret hanya dari environment. Rate limiter khusus dicatat sebagai belum ada, bukan diklaim ada. | Migrasi, `next.config.mjs`, komponen form |
| owasp-audit | Checklist yang relevan: A01 akses (RLS + cek owner di RPC + sanitasi redirect callback), A03 injeksi (tidak ada SQL string dari input, tidak ada innerHTML), A05 misconfig (header, tanpa debug, tanpa CORS wildcard), A07 auth (session lewat Supabase, bukan cookie buatan sendiri), A10 SSRF (tidak ada fetch URL dari user; gambar hanya HTTPS). Kategori lain seperti password hashing tidak relevan karena auth ditangani Supabase. Audit runtime dengan payload XSS tidak dijalankan karena belum ada deployment live. | Migrasi, `app/auth/callback/route.ts`, `components/NftCard.tsx` |
| web-quality-accessibility | Skip link, landmark `main`, `nav` berlabel, `lang="id"`, label pada semua input form, pesan status dengan `role="status"`, fokus keyboard terlihat, target tombol minimal 44px, hormat `prefers-reduced-motion`. Audit Lighthouse dan screen reader tidak dijalankan karena belum ada URL live. | `app/layout.tsx`, `app/globals.css`, komponen form |
| web-quality-performance | Gambar NFT memakai width dan height 512 agar layout stabil, `loading="lazy"` dan `decoding="async"`, font Google memakai preconnect dan `display=swap`, tidak ada script pihak ketiga tambahan, query halaman dibatasi range. Pengukuran Core Web Vitals tidak diklaim karena belum ada field data. | `components/NftCard.tsx`, `app/layout.tsx`, halaman server |
| web-quality-seo | Metadata title dan description di layout dan halaman utama, struktur heading berurutan, `robots.ts` dan `sitemap.ts` hanya untuk rute statis yang nyata, tanpa URL dinamis yang dikarang. Klaim ranking tidak dibuat. | `app/layout.tsx`, `app/robots.ts`, `app/sitemap.ts` |
| web-quality-best-practices | HTML semantik (header, nav, main, footer), tanpa API deprecated, tanpa `document.write`, error ditangani dan ditampilkan sebagai pesan, tidak ada console error dari kode sendiri saat build. Verifikasi header runtime masih menunggu deployment. | `app/layout.tsx`, komponen client |
| web-artifacts-builder | Prinsipnya saja: struktur rapi, sudut kotak, warna datar, tanpa gradient ungu dan tanpa font Inter. Stack tidak diganti ke Vite, shadcn, atau single-file HTML, karena spesifikasi menetapkan Next.js. | `tailwind.config.ts`, `app/globals.css` |
| vercel-cli | Hanya persiapan deploy di README: login lewat browser oleh user, verifikasi proyek hasil `vercel link` sebelum deploy, lalu `vercel --prod`. Tidak ada perintah login, link, atau deploy yang dijalankan di sini. | `README.md` bagian deploy |
| report-writing | Prinsipnya untuk dokumen, bukan untuk bug bounty: dampak dan angka di awal, langkah repro yang bisa disalin, pemisahan yang terverifikasi dan yang belum, tanpa kata "bisa jadi" untuk klaim yang belum dibuktikan. | `README.md`, file ini |

## Skill yang sengaja TIDAK diterapkan

| Skill atau kelompok skill | Alasan satu baris |
| --- | --- |
| Trading dan market: gmgn-skills, binance-skills | BitBots bukan bot trading dan tidak ada swap token di MVP ini. |
| Mining dan pool | Tidak ada penambangan, hashrate, atau payout di web NFT ini. |
| Podcast, audio, dan TTS: generate_podcast, spoken-audio, music-discovery | Tidak ada episode, narasi, atau musik di MVP ini. |
| Video dan motion berat: remotion-skills, short-form-video, gsap-skills, klik-anim, motion-prompt, caption-animation, beat-sync-editing | Animasi berat akan menambah bundle dan risiko build tanpa manfaat untuk mint dan market. |
| Animasi dan tipografi gerak: animation-principles, kinetic-typography, lottiefiles-motion-design | Tema pixel sudah cukup lewat font dan warna, tanpa animasi tambahan. |
| Copywriting viral dan marketing: viral-hooks, viral-captions-and-ctas, copywriting-hooks, twitter-algorithm-optimizer, scrapecreators-research | Tidak ada kampanye konten atau riset audiens di MVP ini. |
| Bug bounty penuh: bb-methodology, bug-bounty-playbook, bug-bounty-disclosure, triage-validation, severity-workflow, web-pentest, ffuf-web-fuzzing, recon-and-methodology | Tidak ada target live dan tidak ada temuan untuk dilaporkan, checklist OWASP statis sudah dipakai sebagai gantinya. |
| Audit smart contract: web3-audit, trailofbits-codeql, trailofbits-semgrep, trailofbits-solana-vulnerability-scanner | Tidak ada smart contract di proyek off-chain ini. |
| Sosial dan posting: social-publishing, social-content-performance, messaging, email-management | Login X hanya untuk auth, bukan untuk posting otomatis. |
| Belanja dan travel: shopping, groceries, flight-booking, hotel-booking, trip-planning, restaurant-reservations, event-tickets | Market di sini adalah market NFT internal, bukan toko, tiket, atau perjalanan. |
| Kesehatan, fitness, dan rumah: health-review, fitness-tracking, home-control, workout-planning | Tidak berhubungan dengan koleksi NFT. |
| Dokumen dan spreadsheet: documents, knowledge-organization, google_docs, google_drive | Dokumen proyek ini adalah README dan STATUS dalam bentuk Markdown, tanpa integrasi Docs atau Drive. |
| Pembuatan file hosting dan artifact visual terpisah: file-hosting, media-library, image-search | Gambar NFT dibuat dari kode dan disimpan di Supabase Storage, bukan dicari atau di-host terpisah. |
| Skill antislop lain yang tidak menyentuh kode: antislop-copywriting, antislop-human, antislop-layoutmobile, antislop-ui, antislop, no-ai-slop, stop-slop, avoid-ai-writing, humanizer | Prinsip anti-slop untuk kode sudah diwakili antislop-code, sisanya mengatur gaya tulisan dan UI generik yang tidak diubah di sini. |
| Skill pengembangan lain yang tidak dipakai: test-driven-development, constraint-driven-development, systematic-debugging, documentation-and-adrs, diagram-design, visual-agent-recording, skill-visual, hallmark, impeccable | Tidak ada suite tes formal, ADR, atau diagram terpisah yang diminta, dan debugging dilakukan langsung dari log build. |
| Skill Vercel desain: vercel-react-best-practices, vercel-web-design-guidelines | Prinsip desainnya tumpang tindih dengan skill frontend yang sudah dipakai, dan deploy belum dilakukan. |
| Skill sistem lain yang tidak relevan: advertising-campaigns, business-finance, customer-outreach, device-data, forget, goals, muse-early-access, muse-feedback, subscription-status, task-management, translation, wearables-comms, app-creation, form-design, home-search, mortgage-comparison, place-discovery, scheduling, share-ideas, style-tryon, wide-research, smb-product-shots, store-operations, self-awareness | Tidak ada iklan, keuangan bisnis, perangkat, langganan, atau fitur lain dari daftar itu di MVP ini. |
