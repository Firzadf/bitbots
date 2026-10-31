"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function TransferForm({ nftId }: { nftId: string }) {
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const target = username.trim();
    if (!/^[A-Za-z0-9_]{3,32}$/.test(target)) {
      setMessage("Target username is not valid. Use 3 to 32 letters, numbers, or underscores.");
      return;
    }
    if (!window.confirm(`Transfer this NFT to @${target}? This action cannot be undone from this page.`)) {
      return;
    }
    setBusy(true);
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.rpc("transfer_nft", {
      p_nft_id: nftId,
      p_to_username: username.trim(),
    });
    setBusy(false);
    if (error) setMessage(`Transfer failed: ${error.message}`);
    else {
      setMessage("Transfer succeeded.");
      window.location.reload();
    }
  }

  return (
    <form onSubmit={onSubmit} className="card p-4">
      <p className="font-pixel text-[10px] text-cyanx mb-3">TRANSFER</p>
      <div className="flex gap-2">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="target username (without @)"
          aria-label="Transfer target username"
          className="input-pixel"
        />
        <button disabled={busy} className="btn-ghost px-4">
          Transfer
        </button>
      </div>
      {message && <p role="status" className="text-sm mt-3 text-gray-300">{message}</p>}
    </form>
  );
}
