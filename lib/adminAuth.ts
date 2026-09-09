import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type AdminIdentity = {
	id: string;
	email?: string;
};

export type AdminAuthorization =
	| { authorized: true; admin: AdminIdentity }
	| { authorized: false; response: NextResponse };

/** Verifies the cookie-backed Supabase identity and explicit admin role. */
export async function requireAdmin(): Promise<AdminAuthorization> {
	const supabase = await createClient();
	const { data, error } = await supabase.auth.getClaims();
	const claims = data?.claims;

	if (error || typeof claims?.sub !== "string") {
		return {
			authorized: false,
			response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
		};
	}

	const appMetadata = claims.app_metadata;
	if (
		typeof appMetadata !== "object" ||
		appMetadata === null ||
		(appMetadata as { role?: unknown }).role !== "admin"
	) {
		return {
			authorized: false,
			response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
		};
	}

	return {
		authorized: true,
		admin: {
			id: claims.sub,
			email: typeof claims.email === "string" ? claims.email : undefined,
		},
	};
}
