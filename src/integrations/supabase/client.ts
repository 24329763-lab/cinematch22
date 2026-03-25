import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// LEGACY KEY - Bypasses Lovable's Identity Interference
const SUPABASE_URL = "https://oykpgvoezkdwpuzmiski.supabase.co";
const LEGACY_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95a3Bndm9lemtkd3B1em1pc2tpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3ODkyMTAsImV4cCI6MjA4OTM2NTIxMH0.QpcdIfX2JfQ2DCDC68L8MihTVf_yilhZg6gqo2FAliw";

export const supabase = createClient<Database>(SUPABASE_URL, LEGACY_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      // Explicitly tells the server to use this key, overriding platform headers
      apikey: LEGACY_ANON_KEY,
    },
  },
});
