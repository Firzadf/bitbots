"use client";

import { useState } from "react";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";

export default function PromoForm() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!hasSupabaseEnv()) {
      setMessage("Supabase is not set up yet.");
      return;
    }
    setBusy(true);
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.rpc("redeem_promo", { p_code: code.trim() });
    setBusy(false);
    if (error) setMessage(`Failed: ${error.message}`);
    else setMessage("Code redeemed. Your free mint quota increased by 1.");
  }

  return (
    <form onSubmit={onSubmit} className="card p-4">
      <p className="font-pixel text-[10px] text-cyanx mb-3">PROMO CODE</p>
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="BITBOTS-XXXX"
          aria-label="Promo code"
          className="input-pixel"
        />
        <button disabled={busy} className="btn-ghost px-4">
          Redeem
        </button>
      </div>
      {message && <p role="status" className="text-sm mt-3 text-gray-300">{message}</p>}
      <p className="text-xs mt-2 text-gray-500">
        Each user can use a given code only once.
      </p>
    </form>
  );
}
