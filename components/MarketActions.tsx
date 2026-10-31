"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function BuyButton({ listingId }: { listingId: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function onBuy() {
    if (!window.confirm("Buy this NFT with your BITS balance?")) return;
    setBusy(true);
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.rpc("buy_nft", { p_listing_id: listingId });
    setBusy(false);
    if (error) setMessage(`Buy failed: ${error.message}`);
    else {
      setMessage("Purchase succeeded.");
      window.location.reload();
    }
  }

  return (
    <div>
      <button onClick={onBuy} disabled={busy} className="btn-neon px-4 py-2 text-sm">
        {busy ? "BUYING..." : "BUY"}
      </button>
      {message && <p role="status" className="text-sm mt-2 text-gray-300">{message}</p>}
    </div>
  );
}

export function CancelButton({ listingId }: { listingId: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function onCancel() {
    if (!window.confirm("Cancel this listing?")) return;
    setBusy(true);
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.rpc("cancel_listing", { p_listing_id: listingId });
    setBusy(false);
    if (error) setMessage(`Failed: ${error.message}`);
    else {
      setMessage("Listing cancelled.");
      window.location.reload();
    }
  }

  return (
    <div>
      <button onClick={onCancel} disabled={busy} className="btn-ghost px-4 py-2 text-sm">
        Cancel
      </button>
      {message && <p role="status" className="text-sm mt-2 text-gray-300">{message}</p>}
    </div>
  );
}
