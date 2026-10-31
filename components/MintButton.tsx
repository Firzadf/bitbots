"use client";

import { useState } from "react";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";

export default function MintButton() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function onMint() {
    if (!hasSupabaseEnv()) {
      setMessage("Supabase is not set up yet. Fill in .env.local first.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setMessage("Log in with X first to mint.");
        return;
      }
      const { data, error } = await supabase.rpc("claim_mint");
      if (error) {
        setMessage(`Mint failed: ${error.message}`);
        return;
      }
      setMessage(`Mint succeeded. NFT id: ${String(data)}`);
      window.location.reload();
    } catch (e) {
      setMessage(`Mint failed: ${e instanceof Error ? e.message : "unknown error"}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button onClick={onMint} disabled={busy} className="btn-neon px-6 py-3">
        {busy ? "MINTING..." : "FREE MINT"}
      </button>
      {message && <p role="status" className="text-sm mt-3 text-gray-300">{message}</p>}
      <p className="text-xs mt-2 text-gray-500">
        Maximum 3 initial free mints per user. Promo codes add quota.
      </p>
    </div>
  );
}
