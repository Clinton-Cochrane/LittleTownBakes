import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { stringifyInventoryCsv } from "@/lib/inventoryBulk";
import type { ProductInventory } from "@/lib/inventory";
import { getLocalInventory } from "@/lib/localData";
import { isLocalMode } from "@/lib/localMode";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/inventory/export?format=csv|json
 * Download current on-hand inventory for bulk editing (requires an admin session).
 */
export async function GET(req: NextRequest) {
	const authorization = await requireAdmin();
	if (!authorization.authorized) return authorization.response;

	const format = (req.nextUrl.searchParams.get("format") ?? "csv").toLowerCase();

	let inventory: ProductInventory[];
	if (isLocalMode()) {
		inventory = await getLocalInventory();
	} else {
		const { data, error } = await supabaseAdmin
			.from("product_inventory")
			.select("*")
			.order("product_id", { ascending: true });
		if (error) return NextResponse.json({ error: error.message }, { status: 400 });
		inventory = (data ?? []) as ProductInventory[];
	}
	const stamp = new Date().toISOString().slice(0, 10);

	if (format === "json") {
		const body = JSON.stringify(inventory, null, 2);
		return new NextResponse(body, {
			headers: {
				"Content-Type": "application/json; charset=utf-8",
				"Content-Disposition": `attachment; filename="inventory-${stamp}.json"`,
			},
		});
	}

	if (format !== "csv") {
		return NextResponse.json({ error: "format must be csv or json" }, { status: 400 });
	}

	const csv = stringifyInventoryCsv(inventory);
	return new NextResponse(csv, {
		headers: {
			"Content-Type": "text/csv; charset=utf-8",
			"Content-Disposition": `attachment; filename="inventory-${stamp}.csv"`,
		},
	});
}
