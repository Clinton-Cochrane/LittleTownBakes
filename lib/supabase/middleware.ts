import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { getPublicSupabaseConfig } from "@/lib/supabase/config";
import { isLocalMode, LOCAL_ADMIN_COOKIE, LOCAL_ADMIN_COOKIE_VALUE } from "@/lib/localMode";

function copySessionResponse(source: NextResponse, destination: NextResponse) {
	source.cookies.getAll().forEach((cookie) => destination.cookies.set(cookie));
	for (const name of ["cache-control", "expires", "pragma"]) {
		const value = source.headers.get(name);
		if (value) destination.headers.set(name, value);
	}
	return destination;
}

export async function updateSession(request: NextRequest) {
	if (isLocalMode()) {
		if (request.nextUrl.pathname === "/admin/login") return NextResponse.next({ request });
		if (request.cookies.get(LOCAL_ADMIN_COOKIE)?.value === LOCAL_ADMIN_COOKIE_VALUE) {
			return NextResponse.next({ request });
		}
		return NextResponse.redirect(new URL("/admin/login", request.url));
	}

	let response = NextResponse.next({ request });
	const { url, publishableKey } = getPublicSupabaseConfig();
	const supabase = createServerClient(
		url,
		publishableKey,
		{
			cookies: {
				getAll() {
					return request.cookies.getAll();
				},
				setAll(cookiesToSet, responseHeaders) {
					cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
					response = NextResponse.next({ request });
					cookiesToSet.forEach(({ name, value, options }) =>
						response.cookies.set(name, value, options)
					);
					Object.entries(responseHeaders).forEach(([name, value]) =>
						response.headers.set(name, value)
					);
				},
			},
		}
	);

	const { data, error } = await supabase.auth.getClaims();
	if (request.nextUrl.pathname === "/admin/login") return response;

	const claims = data?.claims;
	if (error || typeof claims?.sub !== "string") {
		return copySessionResponse(
			response,
			NextResponse.redirect(new URL("/admin/login", request.url))
		);
	}

	const appMetadata = claims.app_metadata;
	if (
		typeof appMetadata !== "object" ||
		appMetadata === null ||
		(appMetadata as { role?: unknown }).role !== "admin"
	) {
		const loginUrl = new URL("/admin/login", request.url);
		loginUrl.searchParams.set("error", "forbidden");
		return copySessionResponse(response, NextResponse.redirect(loginUrl));
	}

	return response;
}
