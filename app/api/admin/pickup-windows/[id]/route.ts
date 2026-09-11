import { NextRequest, NextResponse } from "next/server";
import { requireWritableAdmin } from "@/lib/adminAuth";
import { parsePickupWindowInput, validatePickupWindowTimes } from "@/lib/pickupWindows";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SELECT_FIELDS = "id, start_at, end_at, enabled, created_at, updated_at";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
	const authorization = await requireWritableAdmin();
	if (!authorization.authorized) return authorization.response;
	const { id } = await context.params;
	if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: "Invalid pickup window ID." }, { status: 400 });

	let body: unknown;
	try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }
	if (!body || typeof body !== "object" || Array.isArray(body)) {
		return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
	}
	const input = body as Record<string, unknown>;
	const update: { start_at?: string; end_at?: string; enabled?: boolean; updated_at: string } = {
		updated_at: new Date().toISOString(),
	};
	const editsTimes = input.date !== undefined || input.startTime !== undefined || input.endTime !== undefined;
	if (editsTimes) {
		const times = parsePickupWindowInput(input);
		if ("error" in times) return NextResponse.json({ error: times.error }, { status: 400 });
		update.start_at = times.startAt;
		update.end_at = times.endAt;
	}
	if (input.enabled !== undefined) {
		if (typeof input.enabled !== "boolean") return NextResponse.json({ error: "Enabled must be true or false." }, { status: 400 });
		update.enabled = input.enabled;
	}
	if (!editsTimes && update.enabled === undefined) {
		return NextResponse.json({ error: "No pickup window changes supplied." }, { status: 400 });
	}
	if (editsTimes) {
		const { data, error } = await getSupabaseAdmin().rpc("replace_pickup_window", {
			p_pickup_window_id: id,
			p_start_at: update.start_at,
			p_end_at: update.end_at,
			p_enabled: update.enabled ?? null,
		});
		if (error || !data) return NextResponse.json({ error: "Could not update pickup window." }, { status: 400 });
		return NextResponse.json(data);
	}

	if (update.enabled === true) {
		const { data: existing, error: lookupError } = await getSupabaseAdmin()
			.from("pickup_windows").select("start_at, end_at").eq("id", id).single();
		if (lookupError || !existing) return new NextResponse("Not found", { status: 404 });
		const timeError = validatePickupWindowTimes(existing.start_at, existing.end_at);
		if (timeError) return NextResponse.json({ error: timeError }, { status: 400 });
	}

	const { data, error } = await getSupabaseAdmin().from("pickup_windows").update(update)
		.eq("id", id).select(SELECT_FIELDS).maybeSingle();
	if (error) return NextResponse.json({ error: "Could not update pickup window." }, { status: 400 });
	if (!data) return new NextResponse("Not found", { status: 404 });
	return NextResponse.json(data);
}
