import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { config } from "./config.js";

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_client) {
    _client = createClient(config.supabaseUrl, config.supabaseServiceKey);
  }
  return _client;
}
