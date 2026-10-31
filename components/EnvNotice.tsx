export default function EnvNotice() {
  return (
    <div className="card p-4 mb-6">
      <p className="font-pixel text-xs text-gold mb-2">SUPABASE NOT SET UP</p>
      <p className="text-sm text-gray-300">
        Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in
        .env.local (see .env.example and README.md), then run the migration
        in Supabase. This page will not crash, but live data cannot be
        shown yet.
      </p>
    </div>
  );
}
