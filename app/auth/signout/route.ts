import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isLocalMode, LOCAL_ADMIN_COOKIE } from "@/lib/localMode";

export async function POST(request: NextRequest) {
	if (!isLocalMode()) {
		const supabase = await createClient();
		await supabase.auth.signOut();
	}

	const response = NextResponse.redirect(new URL("/admin/login", request.url), 303);
	if (isLocalMode()) response.cookies.delete(LOCAL_ADMIN_COOKIE);
	response.headers.set("Cache-Control", "private, no-store");
	return response;
}
