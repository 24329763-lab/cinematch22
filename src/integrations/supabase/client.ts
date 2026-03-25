import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Verified working keys for project oykpgvoezkdwpuzmiski
const SUPABASE_URL = "https://oykpgvoezkdwpuzmiski.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_b_pwD_Bp62NwtcWOfSKG8A_tPk6vtBu";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: false, // Forces a fresh start on every browser
    autoRefreshToken: true,
  },
  global: {
    headers: {
      // This wipes out the "Lovable Identity" that is causing the 403 error
      Authorization: `Bearer sb_publishable_b_pwD_Bp62NwtcWOfSKG8A_tPk6vtBu`,
    },
  },
});
