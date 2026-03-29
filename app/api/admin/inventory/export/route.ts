import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { stringifyInventoryCsv } from "@/lib/inventoryBulk";
import type { InventorySlot } from "@/lib/inventory";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/inventory/export?format=csv|json
 * Download current inventory_slots for bulk editing (requires x-admin-key).
 */
export async function GET(req: NextRequest) {
	const err = requireAdmin(req);
	if (err) return err;

	const format = (req.nextUrl.searchParams.get("format") ?? "csv").toLowerCase();

	const { data, error } = await supabaseAdmin
		.from("inventory_slots")
		.select("*")
		.order("period_start", { ascending: false });

	if (error) return NextResponse.json({ error: error.message }, { status: 400 });

	const slots = (data ?? []) as InventorySlot[];
	const stamp = new Date().toISOString().slice(0, 10);

	if (format === "json") {
		const body = JSON.stringify(slots, null, 2);
		return new NextResponse(body, {
			headers: {
				"Content-Type": "application/json; charset=utf-8",
				"Content-Disposition": `attachment; filename="inventory-slots-${stamp}.json"`,
			},
		});
	}

	if (format !== "csv") {
		return NextResponse.json({ error: "format must be csv or json" }, { status: 400 });
	}

	const csv = stringifyInventoryCsv(slots);
	return new NextResponse(csv, {
		headers: {
			"Content-Type": "text/csv; charset=utf-8",
			"Content-Disposition": `attachment; filename="inventory-slots-${stamp}.csv"`,
		},
	});
}
