import "dotenv/config";

export const config = {
  botToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
  webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET ?? "",
  port: Number(process.env.PORT ?? 3001),
  host: process.env.HOST ?? "0.0.0.0",
  webhookUrl: process.env.WEBHOOK_URL ?? "",
  digestIntervalHours: Number(process.env.DIGEST_INTERVAL_HOURS ?? 4),
  pollingTimeoutSec: Number(process.env.POLLING_TIMEOUT_SEC ?? 30),
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY ?? "",
  gmailClientId: process.env.GMAIL_CLIENT_ID ?? "",
  gmailClientSecret: process.env.GMAIL_CLIENT_SECRET ?? "",
  get usePolling(): boolean {
    return !this.webhookUrl;
  },
} as const;

const TELEGRAM_API = "https://api.telegram.org";

export function apiUrl(method: string): string {
  return `${TELEGRAM_API}/bot${config.botToken}/${method}`;
}
