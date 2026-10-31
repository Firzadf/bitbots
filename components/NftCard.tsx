import Link from "next/link";
import type { NftRow } from "@/lib/types";
import { formatBits } from "@/lib/types";

export default function NftCard({ nft, price }: { nft: NftRow; price?: number }) {
  return (
    <Link href={`/nft/${nft.id}`} className="card p-3 block">
      {nft.image_url && nft.image_url.startsWith("https://") ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={nft.image_url}
          alt={nft.name}
          width={512}
          height={512}
          loading="lazy"
          decoding="async"
          className="pixel-img w-full aspect-square object-cover bg-black"
        />
      ) : (
        <div className="w-full aspect-square bg-black flex items-center justify-center text-xs text-gray-500">
          NO IMAGE
        </div>
      )}
      <p className="font-pixel text-[10px] mt-3 text-neon">{nft.name}</p>
      <p className="text-xs text-gray-400 mt-2">
        #{nft.token_number} - {nft.rarity_tier ?? "-"} - Skor{" "}
        {nft.rarity_score ?? "-"}
      </p>
      {price !== undefined && (
        <p className="text-sm text-gold mt-1">{formatBits(price)} BITS</p>
      )}
      <p className="text-xs mt-1">
        {nft.is_minted ? "Minted" : "Not minted yet"}
      </p>
    </Link>
  );
}
