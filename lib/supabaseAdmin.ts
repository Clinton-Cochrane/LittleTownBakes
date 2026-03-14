// lib/supabaseAdmin.ts
import { createClient } from "@supabase/supabase-js";

<<<<<<< HEAD
// Placeholders for build when env vars are not set (e.g. CI)
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const service = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder";

export const supabaseAdmin = createClient(url, service, {
	auth: { persistSession: false, autoRefreshToken: false },
});
=======
export function getSupabaseAdmin() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if(!url || !key) {
        throw new Error("supabaseURL is required.");
    }

    return createClient(url, key, {
        auth:{persistSession:false},
    });
}
>>>>>>> a004a02a44dfab223c819b0df54706f05fc1824c
