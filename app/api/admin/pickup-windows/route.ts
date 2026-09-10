import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { parsePickupWindowInput } from "@/lib/pickupWindows";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const SELECT_FIELDS = "id, start_at, end_at, enabled, created_at, updated_at";

export async function GET() {
	const authorization = await requireAdmin();
	if (!authorization.authorized) return authorization.response;

	const { data, error } = await getSupabaseAdmin()
		.from("pickup_windows")
		.select(SELECT_FIELDS)
		.order("start_at", { ascending: true });
	if (error) return NextResponse.json({ error: "Could not load pickup windows." }, { status: 400 });
	return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
	const authorization = await requireAdmin();
	if (!authorization.authorized) return authorization.response;

	let body: unknown;
	try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }
	if (!body || typeof body !== "object" || Array.isArray(body)) {
		return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
	}
	const times = parsePickupWindowInput(body as Record<string, unknown>);
	if ("error" in times) return NextResponse.json({ error: times.error }, { status: 400 });

	const { data, error } = await getSupabaseAdmin().from("pickup_windows").insert({
		start_at: times.startAt,
		end_at: times.endAt,
		enabled: true,
	}).select(SELECT_FIELDS).single();
	if (error || !data) return NextResponse.json({ error: "Could not create pickup window." }, { status: 400 });
	return NextResponse.json(data, { status: 201 });
}
