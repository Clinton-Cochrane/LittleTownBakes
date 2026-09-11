import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { isLocalMode, localMutationUnavailable, LOCAL_ADMIN_COOKIE, LOCAL_ADMIN_COOKIE_VALUE, LOCAL_ADMIN_EMAIL } from "@/lib/localMode";

export type AdminIdentity = {
	id: string;
	email?: string;
};

export type AdminAuthorization =
	| { authorized: true; admin: AdminIdentity }
	| { authorized: false; response: NextResponse };

/** Verifies the cookie-backed Supabase identity and explicit admin role. */
export async function requireAdmin(): Promise<AdminAuthorization> {
	if (isLocalMode()) {
		const cookieStore = await cookies();
		if (cookieStore.get(LOCAL_ADMIN_COOKIE)?.value !== LOCAL_ADMIN_COOKIE_VALUE) {
			return {
				authorized: false,
				response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
			};
		}
		return { authorized: true, admin: { id: "local-admin", email: LOCAL_ADMIN_EMAIL } };
	}

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

/** Authenticates an admin and keeps JSON-backed local development read-only. */
export async function requireWritableAdmin(): Promise<AdminAuthorization> {
	const authorization = await requireAdmin();
	if (!authorization.authorized) return authorization;
	if (isLocalMode()) {
		return { authorized: false, response: localMutationUnavailable() };
	}
	return authorization;
}
