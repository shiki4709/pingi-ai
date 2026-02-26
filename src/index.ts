import * as dotenv from "dotenv";
dotenv.config();

import { fetchGmailItems, fetchTwitterItems, fetchLinkedInItems } from "./connectors";
import { generateDraftsForItems } from "./services/drafter";
import { formatDigest } from "./services/digest";
import { DigestResult, EngagementItem } from "./types";

async function run() {
  const lookback = parseInt(process.env.LOOKBACK_HOURS || "24", 10);
  const skipDrafts = process.argv.includes("--no-drafts");

  console.log(`\n🔔 Pingi AI — Phase 0 Digest`);
  console.log(`   Looking back ${lookback} hours\n`);

  // ─── Fetch from all platforms in parallel ───
  console.log("📡 Fetching from platforms...");

  const [gmailResult, twitterResult, linkedinResult] = await Promise.all([
    fetchGmailItems(lookback),
    fetchTwitterItems(lookback),
    fetchLinkedInItems(lookback),
  ]);

  // Log errors
  const allErrors = [
    ...gmailResult.errors,
    ...twitterResult.errors,
    ...linkedinResult.errors,
  ];
  if (allErrors.length > 0) {
    console.log("\n⚠️  Warnings:");
    allErrors.forEach((e) => console.log(`   ${e}`));
  }

  // ─── Combine all items ───
  let allItems: EngagementItem[] = [
    ...gmailResult.items,
    ...twitterResult.items,
    ...linkedinResult.items,
  ];

  console.log(
    `\n📊 Found ${allItems.length} items needing reply ` +
      `(${gmailResult.items.length} Gmail, ${twitterResult.items.length} Twitter, ${linkedinResult.items.length} LinkedIn)`
  );

  // ─── Generate AI drafts ───
  if (!skipDrafts && allItems.length > 0) {
    allItems = await generateDraftsForItems(allItems);
  } else if (skipDrafts) {
    console.log("\n⏭️  Skipping AI drafts (--no-drafts flag)");
  }

  // ─── Format and print digest ───
  const digest: DigestResult = {
    items: allItems,
    generatedAt: new Date(),
    platforms: {
      gmail: {
        fetched: gmailResult.items.length + gmailResult.errors.length,
        needsReply: gmailResult.items.length,
      },
      twitter: {
        fetched: twitterResult.items.length + twitterResult.errors.length,
        needsReply: twitterResult.items.length,
      },
      linkedin: {
        fetched: linkedinResult.items.length + linkedinResult.errors.length,
        needsReply: linkedinResult.items.length,
      },
    },
  };

  const output = formatDigest(digest);
  console.log(output);

  // Optionally save to file
  if (process.argv.includes("--save")) {
    const fs = await import("fs");
    const filename = `digest-${new Date().toISOString().split("T")[0]}.txt`;
    fs.writeFileSync(filename, output);
    console.log(`\n💾 Saved to ${filename}`);
  }
}

run().catch((e) => {
  console.error("❌ Pingi digest failed:", e);
  process.exit(1);
});
