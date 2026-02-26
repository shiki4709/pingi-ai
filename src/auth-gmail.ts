import * as dotenv from "dotenv";
dotenv.config();

import { getGmailAuthUrl, exchangeGmailCode } from "./connectors/gmail";

async function main() {
  const arg = process.argv[2];

  if (!arg) {
    // Step 1: Generate auth URL
    const url = await getGmailAuthUrl();
    console.log("\n🔐 Gmail OAuth Setup\n");
    console.log("1. Open this URL in your browser:\n");
    console.log(url);
    console.log("\n2. Sign in and authorize the app");
    console.log("3. Copy the authorization code from the redirect URL");
    console.log("4. Run: npx tsx src/auth-gmail.ts YOUR_CODE_HERE\n");
    return;
  }

  // Step 2: Exchange code for tokens
  console.log("\n🔄 Exchanging code for tokens...\n");
  const refreshToken = await exchangeGmailCode(arg);

  if (refreshToken) {
    console.log("✅ Add this to your .env file:");
    console.log(`GOOGLE_REFRESH_TOKEN=${refreshToken}`);
  }
}

main().catch(console.error);
