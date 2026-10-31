"use client";

import { useState } from "react";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";

export default function MintButton() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function onMint() {
    if (!hasSupabaseEnv()) {
      setMessage("Supabase belum diset. Isi .env.local dulu.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setMessage("Login dengan X dulu untuk mint.");
        return;
      }
      const { data, error } = await supabase.rpc("claim_mint");
      if (error) {
        setMessage(`Mint gagal: ${error.message}`);
        return;
      }
      setMessage(`Mint berhasil. NFT id: ${String(data)}`);
      window.location.reload();
    } catch (e) {
      setMessage(`Mint gagal: ${e instanceof Error ? e.message : "unknown error"}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button onClick={onMint} disabled={busy} className="btn-neon px-6 py-3">
        {busy ? "MINTING..." : "MINT GRATIS"}
      </button>
      {message && <p role="status" className="text-sm mt-3 text-gray-300">{message}</p>}
      <p className="text-xs mt-2 text-gray-500">
        Maksimal 3 free mint awal per user. Kode promo menambah kuota.
      </p>
    </div>
  );
}
