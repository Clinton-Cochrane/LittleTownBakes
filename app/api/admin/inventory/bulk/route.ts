import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import {
	parseInventoryBulkJson,
	parseInventoryCsv,
	validateBulkRow,
	type BulkRowsParseResult,
} from "@/lib/inventoryBulk";
import { setProductInventory } from "@/lib/inventoryUpsert";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/inventory/bulk
 *
 * Sets current on-hand quantities from CSV or JSON (requires an admin session).
 *
 * **CSV:** `Content-Type: text/csv` or `text/plain` — body is CSV text
 * (columns: product_id, quantity_on_hand).
 *
 * **JSON:** `Content-Type: application/json` — either `[{...}, ...]` or `{ "rows": [...] }`
 * with the same fields as CSV rows.
 */
export async function POST(req: NextRequest) {
	const authorization = await requireAdmin();
	if (!authorization.authorized) return authorization.response;

	const type = (req.headers.get("content-type") ?? "").toLowerCase();
	let rowsResult: BulkRowsParseResult;

	if (type.includes("text/csv") || (type.includes("text/plain") && !type.includes("json"))) {
		const text = await req.text();
		rowsResult = parseInventoryCsv(text);
	} else {
		let body: unknown;
		try {
			body = await req.json();
		} catch {
			return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
		}
		const raw = Array.isArray(body) ? body : (body as { rows?: unknown }).rows;
		rowsResult = parseInventoryBulkJson(raw);
	}

	if (!rowsResult.ok) {
		return NextResponse.json({ error: rowsResult.message }, { status: 400 });
	}

	const errors: { index: number; message: string }[] = [];
	let updated = 0;

	for (let i = 0; i < rowsResult.rows.length; i++) {
		const rawRow = rowsResult.rows[i]!;
		const v = validateBulkRow(rawRow, i);
		if (!v.ok) {
			errors.push({ index: v.index, message: v.message });
			continue;
		}
		const up = await setProductInventory(v.row);
		if (!up.ok) {
			errors.push({ index: i, message: up.error });
			continue;
		}
		updated++;
	}

	return NextResponse.json({
		updated,
		errors,
		processed: rowsResult.rows.length,
	});
}
