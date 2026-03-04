import { config } from "./config.js";
import { setWebhook } from "./telegram.js";

if (!config.botToken) {
  console.error("TELEGRAM_BOT_TOKEN is required");
  process.exit(1);
}

if (!config.webhookUrl) {
  console.error("WEBHOOK_URL is required");
  process.exit(1);
}

const url = `${config.webhookUrl}/webhook`;
await setWebhook(url, config.webhookSecret);
console.log("Done.");
