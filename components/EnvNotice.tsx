export default function EnvNotice() {
  return (
    <div className="card p-4 mb-6">
      <p className="font-pixel text-xs text-gold mb-2">SUPABASE BELUM DISET</p>
      <p className="text-sm text-gray-300">
        Set NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY di
        .env.local (lihat .env.example dan README.md), lalu jalankan migrasi
        di Supabase. Halaman ini tidak akan crash, tetapi data live belum
        bisa ditampilkan.
      </p>
    </div>
  );
}
