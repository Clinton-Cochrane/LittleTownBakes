import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function requireAdmin(req: NextRequest): NextResponse | null {
	const key = req.headers.get("x-admin-key");
	if (key !== process.env.ADMIN_KEY) return new NextResponse("Unauthorized", { status: 401 });
	return null;
}

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

	const qty = Math.max(0, quantity_available);

	const { data: existing } = await supabaseAdmin
		.from("inventory_slots")
		.select("id, quantity_sold")
		.eq("item_id", item_id)
		.eq("period_type", period_type)
		.eq("period_start", period_start)
		.single();

	if (existing) {
		const { data, error } = await supabaseAdmin
			.from("inventory_slots")
			.update({ quantity_available: qty })
			.eq("id", existing.id)
			.select()
			.single();
		if (error) return NextResponse.json({ error: error.message }, { status: 400 });
		return NextResponse.json(data);
	}

	const { data, error } = await supabaseAdmin
		.from("inventory_slots")
		.insert({ item_id, period_type, period_start, quantity_available: qty, quantity_sold: 0 })
		.select()
		.single();

	if (error) return NextResponse.json({ error: error.message }, { status: 400 });
	return NextResponse.json(data);
}
