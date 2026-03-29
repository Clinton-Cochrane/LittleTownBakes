import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { upsertInventorySlot } from "@/lib/inventoryUpsert";

export async function GET(req: NextRequest) {
	const err = requireAdmin(req);
	if (err) return err;

	const { data, error } = await supabaseAdmin
		.from("inventory_slots")
		.select("*")
		.order("period_start", { ascending: false });

	if (error) return NextResponse.json({ error: error.message }, { status: 400 });
	return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
	const err = requireAdmin(req);
	if (err) return err;

	const body = await req.json();
	const { item_id, period_type, period_start, quantity_available } = body;

	if (!item_id || !period_type || !period_start || typeof quantity_available !== "number") {
		return NextResponse.json(
			{ error: "item_id, period_type, period_start, quantity_available required" },
			{ status: 400 }
		);
	}
	if (!["week", "month"].includes(period_type)) {
		return NextResponse.json({ error: "period_type must be week or month" }, { status: 400 });
	}

	const result = await upsertInventorySlot({
		item_id,
		period_type,
		period_start,
		quantity_available,
	});
	if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
	return NextResponse.json(result.data);
}
