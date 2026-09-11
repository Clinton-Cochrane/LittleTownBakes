import { NextRequest, NextResponse } from "next/server";
import {
	isLocalMode,
	LOCAL_ADMIN_COOKIE,
	LOCAL_ADMIN_COOKIE_VALUE,
	LOCAL_ADMIN_EMAIL,
	LOCAL_ADMIN_PASSWORD,
} from "@/lib/localMode";
import { createClient } from "@/lib/supabase/server";

function redirect(request: NextRequest, pathname: string) {
	return NextResponse.redirect(new URL(pathname, request.url), 303);
}

export async function POST(request: NextRequest) {
	const form = await request.formData();
	const email = String(form.get("email") ?? "").trim();
	const password = String(form.get("password") ?? "");

	if (isLocalMode()) {
		if (email !== LOCAL_ADMIN_EMAIL || password !== LOCAL_ADMIN_PASSWORD) {
			return redirect(request, "/admin/login?error=invalid");
		}
		const response = redirect(request, "/admin/orders");
		response.cookies.set(LOCAL_ADMIN_COOKIE, LOCAL_ADMIN_COOKIE_VALUE, {
			httpOnly: true,
			sameSite: "lax",
			path: "/",
			secure: false,
		});
		return response;
	}

	const supabase = await createClient();
	const { error } = await supabase.auth.signInWithPassword({ email, password });
	return redirect(request, error ? "/admin/login?error=invalid" : "/admin/orders");
}
