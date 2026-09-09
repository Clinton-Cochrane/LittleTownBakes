import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
	const supabase = await createClient();
	await supabase.auth.signOut();

	const response = NextResponse.redirect(new URL("/admin/login", request.url), 303);
	response.headers.set("Cache-Control", "private, no-store");
	return response;
}
