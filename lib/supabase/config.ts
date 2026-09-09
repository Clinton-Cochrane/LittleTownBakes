const placeholderUrl = "https://placeholder.supabase.co";
const placeholderPublishableKey = "placeholder";

export function getPublicSupabaseConfig() {
	return {
		url: process.env.NEXT_PUBLIC_SUPABASE_URL || placeholderUrl,
		publishableKey:
			process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || placeholderPublishableKey,
	};
}
