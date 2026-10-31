"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ListForm({ nftId }: { nftId: string }) {
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number(price);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setMessage("Price must be a number greater than 0.");
      return;
    }
    setBusy(true);
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.rpc("list_nft", {
      p_nft_id: nftId,
      p_price: Number(price),
    });
    setBusy(false);
    if (error) setMessage(`Listing failed: ${error.message}`);
    else {
      setMessage("Listing created.");
      window.location.reload();
    }
  }

  return (
    <form onSubmit={onSubmit} className="card p-4">
      <p className="font-pixel text-[10px] text-gold mb-3">SELL ON THE MARKET</p>
      <div className="flex gap-2">
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="BITS price, e.g. 50"
          type="number"
          min="0"
          step="0.01"
          aria-label="Listing price in BITS"
          className="input-pixel"
        />
        <button disabled={busy} className="btn-neon px-4">
          List
        </button>
      </div>
      {message && <p role="status" className="text-sm mt-3 text-gray-300">{message}</p>}
      <p className="text-xs mt-2 text-gray-500">Fee market 2,5 persen to treasury.</p>
    </form>
  );
}
