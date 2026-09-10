import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { CustomerPickupWindow } from "@/lib/pickupWindows";

type PickupWindowRow = { id: string; start_at: string; end_at: string };

export async function GET() {
	const { data, error } = await getSupabaseAdmin().rpc("list_available_pickup_windows");
	if (error) {
		console.error("[pickup-windows] availability lookup failed", error);
		return NextResponse.json({ error: "Pickup times are temporarily unavailable." }, { status: 503 });
	}
	const windows: CustomerPickupWindow[] = ((data ?? []) as PickupWindowRow[]).map((window) => ({
		id: window.id,
		startAt: window.start_at,
		endAt: window.end_at,
	}));
	return NextResponse.json(windows, { headers: { "Cache-Control": "no-store" } });
}
