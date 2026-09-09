import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
	const authorization = await requireAdmin();
	if (!authorization.authorized) return authorization.response;

	const { data, error } = await supabaseAdmin
		.from("flavor_requests")
		.select("*")
		.order("created_at", { ascending: false });

	if (error) return NextResponse.json({ error: error.message }, { status: 400 });
	return NextResponse.json(data ?? []);
}

export async function PATCH(req: NextRequest) {
	const authorization = await requireAdmin();
	if (!authorization.authorized) return authorization.response;

	const body = await req.json();
	const { id, status } = body;

	if (!id || !["pending", "notified", "ignored"].includes(status)) {
		return NextResponse.json({ error: "id and status (pending|notified|ignored) required" }, { status: 400 });
	}

	const { data, error } = await supabaseAdmin
		.from("flavor_requests")
		.update({ status })
		.eq("id", id)
		.select()
		.single();

	if (error) return NextResponse.json({ error: error.message }, { status: 400 });
	return NextResponse.json(data);
}
