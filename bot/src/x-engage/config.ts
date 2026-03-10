import "dotenv/config";

export const config = {
  botToken: process.env.TELEGRAM_X_BOT_TOKEN ?? "",
  port: Number(process.env.X_BOT_PORT ?? 3011),
  host: process.env.HOST ?? "0.0.0.0",
  webhookUrl: process.env.X_BOT_WEBHOOK_URL ?? "",
  webhookSecret: process.env.X_BOT_WEBHOOK_SECRET ?? "",
  pollingTimeoutSec: Number(process.env.POLLING_TIMEOUT_SEC ?? 30),
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY ?? "",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  socialDataApiKey: process.env.SOCIALDATA_API_KEY ?? "",
  twitterApiKey: process.env.TWITTER_API_KEY ?? "",
  twitterApiSecret: process.env.TWITTER_API_SECRET ?? "",
  twitterAccessToken: process.env.TWITTER_ACCESS_TOKEN ?? "",
  twitterAccessSecret: process.env.TWITTER_ACCESS_SECRET ?? "",
  get usePolling(): boolean {
    return !this.webhookUrl;
  },
} as const;

const TELEGRAM_API = "https://api.telegram.org";

export function apiUrl(method: string): string {
  return `${TELEGRAM_API}/bot${config.botToken}/${method}`;
}
