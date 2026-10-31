// Live RPC test harness for BitBots. Runs in GitHub Actions only.
// Uses SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY
// from the Action environment (GitHub Secrets). No key is ever logged.
// Test users are created with random emails, used for the tests, then
// cleaned up in the finally block so production data is not polluted:
// their mints, transfers, sales, listings, redemptions, balances and
// ledger rows are removed, their minted NFTs are reset to unminted,
// the treasury fee from the buy test is reversed, and the auth users
// are deleted. The promo code created for the test is also deleted.
//
// Usage in Actions: npm run test:rpc
// Exit 0 only if every assertion passes.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const url = process.env.SUPABASE_URL as string;
const anonKey = process.env.SUPABASE_ANON_KEY as string;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
if (!url || !anonKey || !serviceKey) {
  throw new Error("SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY are required.");
}

const service = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
  console.log(`PASS: ${message}`);
}

function fail(message: string): never {
  throw new Error(`FAIL: ${message}`);
}

interface TestUser {
  id: string;
  email: string;
  client: SupabaseClient;
  mintedNftIds: string[];
}

async function makeUser(tag: string): Promise<TestUser> {
  const email = `bitbots-test-${tag}-${randomUUID().slice(0, 8)}@example.invalid`;
  const password = randomUUID() + randomUUID();
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error("createUser returned no user");
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signError } = await client.auth.signInWithPassword({ email, password });
  if (signError) throw signError;
  // Wait for the signup trigger to create the profile.
  for (let i = 0; i < 20; i++) {
    const { data: profile } = await service
      .from("profiles")
      .select("id")
      .eq("id", data.user.id)
      .single();
    if (profile) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  return { id: data.user.id, email, client, mintedNftIds: [] };
}

async function balanceOf(userId: string): Promise<number> {
  const { data } = await service.from("balances").select("amount_bits").eq("user_id", userId).single();
  return data ? Number(data.amount_bits) : 0;
}

async function main(): Promise<void> {
  const suffix = randomUUID().slice(0, 8).toUpperCase();
  const promoCode = `TEST-${suffix}`;
  const users: TestUser[] = [];
  let listingId: string | null = null;
  let treasuryBefore = 0;
  let feeTestPrice = 100;
  try {
    const { data: unminted, error: countError } = await service
      .from("nfts")
      .select("id", { count: "exact", head: true })
      .eq("is_minted", false);
    if (countError) throw countError;
    const unmintedCount = unminted as unknown as number | null;
    console.log(`Unminted NFTs available: ${unmintedCount ?? "unknown"}`);
    assert((unmintedCount ?? 0) >= 10, "at least 10 unminted NFTs exist (run the generator first)");

    treasuryBefore = await balanceOf("00000000-0000-0000-0000-000000000001");
    console.log(`Treasury balance before buy test: ${treasuryBefore}`);

    // 1. Concurrent mint: two simultaneous claim_mint calls must give
    // two different NFTs, never the same one.
    const mintUser = await makeUser("mint");
    users.push(mintUser);
    const [first, second] = await Promise.all([
      mintUser.client.rpc("claim_mint"),
      mintUser.client.rpc("claim_mint"),
    ]);
    if (first.error) fail(`concurrent mint 1 failed: ${first.error.message}`);
    if (second.error) fail(`concurrent mint 2 failed: ${second.error.message}`);
    assert(first.data !== second.data, "concurrent mints returned different NFT ids");
    mintUser.mintedNftIds.push(String(first.data), String(second.data));
    const third = await mintUser.client.rpc("claim_mint");
    if (third.error) fail(`third mint failed: ${third.error.message}`);
    mintUser.mintedNftIds.push(String(third.data));

    // 2. Fourth mint must fail (quota is 3).
    const fourth = await mintUser.client.rpc("claim_mint");
    assert(Boolean(fourth.error), "fourth mint fails when quota is exhausted");
    console.log(`Fourth mint error (expected): ${fourth.error?.message}`);

    // 3. Promo redeem twice: first succeeds, second fails for the same user.
    const promoUser = await makeUser("promo");
    users.push(promoUser);
    const { error: promoInsertError } = await service.from("promo_codes").insert({
      code: promoCode,
      max_uses: 10,
      used_count: 0,
      free_mints: 1,
    });
    if (promoInsertError) throw promoInsertError;
    const redeem1 = await promoUser.client.rpc("redeem_promo", { p_code: promoCode });
    if (redeem1.error) fail(`first promo redeem failed: ${redeem1.error.message}`);
    assert(redeem1.data === true, "first promo redeem returns true");
    const redeem2 = await promoUser.client.rpc("redeem_promo", { p_code: promoCode });
    assert(Boolean(redeem2.error), "second promo redeem by the same user fails");
    console.log(`Second redeem error (expected): ${redeem2.error?.message}`);

    // 4. Transfer to a nonexistent username must fail and change nothing.
    const transferUser = await makeUser("transfer");
    users.push(transferUser);
    const minted = await transferUser.client.rpc("claim_mint");
    if (minted.error) fail(`transfer test mint failed: ${minted.error.message}`);
    const transferNftId = String(minted.data);
    transferUser.mintedNftIds.push(transferNftId);
    const badTransfer = await transferUser.client.rpc("transfer_nft", {
      p_nft_id: transferNftId,
      p_to_username: "no_such_user_xyz_123",
    });
    assert(Boolean(badTransfer.error), "transfer to a nonexistent username fails");
    console.log(`Bad transfer error (expected): ${badTransfer.error?.message}`);
    const { data: nftAfter } = await service.from("nfts").select("owner_id").eq("id", transferNftId).single();
    assert(nftAfter?.owner_id === transferUser.id, "failed transfer did not change ownership");

    // 5. Buy without enough balance must fail and change nothing.
    const seller = await makeUser("seller");
    const buyer = await makeUser("buyer");
    users.push(seller, buyer);
    const sellerMint = await seller.client.rpc("claim_mint");
    if (sellerMint.error) fail(`seller mint failed: ${sellerMint.error.message}`);
    const sellerNftId = String(sellerMint.data);
    seller.mintedNftIds.push(sellerNftId);
    const listExpensive = await seller.client.rpc("list_nft", { p_nft_id: sellerNftId, p_price: 1000 });
    if (listExpensive.error) fail(`listing at 1000 failed: ${listExpensive.error.message}`);
    const { data: expensiveListing } = await service
      .from("listings")
      .select("id")
      .eq("nft_id", sellerNftId)
      .eq("active", true)
      .single();
    listingId = expensiveListing?.id ?? null;
    const poorBuy = await buyer.client.rpc("buy_nft", { p_listing_id: listingId });
    assert(Boolean(poorBuy.error), "buy with insufficient balance fails");
    console.log(`Poor buy error (expected): ${poorBuy.error?.message}`);
    const { data: listingAfter } = await service.from("listings").select("active").eq("id", listingId).single();
    assert(listingAfter?.active === true, "failed buy left the listing active");
    assert((await balanceOf(buyer.id)) === 100, "failed buy did not change buyer balance");

    // 6. Successful buy: seller gets 97.5, treasury gets 2.5, buyer pays 100.
    const cancel = await seller.client.rpc("cancel_listing", { p_listing_id: listingId });
    if (cancel.error) fail(`cancel listing failed: ${cancel.error.message}`);
    const listCheap = await seller.client.rpc("list_nft", { p_nft_id: sellerNftId, p_price: feeTestPrice });
    if (listCheap.error) fail(`listing at 100 failed: ${listCheap.error.message}`);
    const { data: cheapListing } = await service
      .from("listings")
      .select("id")
      .eq("nft_id", sellerNftId)
      .eq("active", true)
      .single();
    listingId = cheapListing?.id ?? null;
    const sellerBefore = await balanceOf(seller.id);
    const buyerBefore = await balanceOf(buyer.id);
    const goodBuy = await buyer.client.rpc("buy_nft", { p_listing_id: listingId });
    if (goodBuy.error) fail(`buy at 100 failed: ${goodBuy.error.message}`);
    assert((await balanceOf(buyer.id)) === buyerBefore - feeTestPrice, "buyer balance decreased by price");
    assert((await balanceOf(seller.id)) === sellerBefore + 97.5, "seller received 97.5 percent");
    assert(
      (await balanceOf("00000000-0000-0000-0000-000000000001")) === treasuryBefore + 2.5,
      "treasury received 2.5 percent fee",
    );
    const { data: nftSold } = await service.from("nfts").select("owner_id").eq("id", sellerNftId).single();
    assert(nftSold?.owner_id === buyer.id, "successful buy moved ownership to buyer");

    console.log("ALL RPC TESTS PASSED");
  } finally {
    // Cleanup: remove every test artefact, then delete the test users.
    try {
      const userIds = users.map((u) => u.id);
      const nftIds = users.flatMap((u) => u.mintedNftIds);
      if (nftIds.length > 0) {
        await service.from("listings").delete().in("nft_id", nftIds);
        await service.from("sales").delete().in("nft_id", nftIds);
        await service.from("mints").delete().in("nft_id", nftIds);
        await service.from("transfers").delete().in("nft_id", nftIds);
        await service
          .from("nfts")
          .update({ is_minted: false, owner_id: null, minted_at: null })
          .in("id", nftIds);
      }
      if (userIds.length > 0) {
        await service.from("promo_redemptions").delete().in("user_id", userIds);
        await service.from("balances").delete().in("user_id", userIds);
        await service.from("ledger").delete().in("user_id", userIds);
        await service.from("profiles").delete().in("id", userIds);
      }
      // Reverse the treasury fee from the buy test, if it happened.
      if (listingId) {
        await service.from("ledger").delete().eq("ref_id", listingId).eq("type", "fee");
        await service
          .from("balances")
          .update({ amount_bits: treasuryBefore })
          .eq("user_id", "00000000-0000-0000-0000-000000000001");
      }
      await service.from("promo_codes").delete().eq("code", promoCode);
      for (const u of users) {
        await service.auth.admin.deleteUser(u.id);
      }
      console.log("Test cleanup done.");
    } catch (cleanupError) {
      console.error("Cleanup warning (tests may still have passed):", cleanupError);
    }
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
