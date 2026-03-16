// lib/supabaseAdmin.ts
import { createClient } from "@supabase/supabase-js";

// Placeholders for build when env vars are not set (e.g. CI)
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const service = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder";

const client = createClient(url, service, {
	auth: { persistSession: false, autoRefreshToken: false },
});

export const supabaseAdmin = client;

export function getSupabaseAdmin() {
	return client;
}
