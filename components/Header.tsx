"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";

export default function Header() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasSupabaseEnv()) {
      setLoading(false);
      return;
    }
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function login() {
    if (!hasSupabaseEnv()) {
      alert("Supabase belum diset. Isi .env.local dulu, lihat README.md.");
      return;
    }
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "twitter",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <header className="border-b-2 border-[#2a2a4a] bg-[#0a0a12] sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4 flex-wrap">
        <Link href="/" className="font-pixel text-sm text-neon">
          BITBOTS
        </Link>
        <nav aria-label="Navigasi utama" className="flex gap-4 text-sm flex-wrap">
          <Link href="/explore" className="hover:text-neon">Explore</Link>
          <Link href="/market" className="hover:text-neon">Market</Link>
          <Link href="/leaderboard" className="hover:text-neon">Leaderboard</Link>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {loading ? (
            <span className="text-xs text-gray-400">...</span>
          ) : email ? (
            <>
              <span className="text-xs text-gray-300 max-w-[180px] truncate">{email}</span>
              <button onClick={logout} className="btn-ghost px-3 py-2 text-sm">
                Logout
              </button>
            </>
          ) : (
            <button onClick={login} className="btn-neon px-3 py-2 text-sm">
              Login dengan X
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
