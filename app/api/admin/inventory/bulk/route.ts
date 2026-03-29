import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import {
	parseInventoryBulkJson,
	parseInventoryCsv,
	validateBulkRow,
	type BulkRowsParseResult,
} from "@/lib/inventoryBulk";
import { upsertInventorySlot } from "@/lib/inventoryUpsert";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/inventory/bulk
 *
 * Upserts many slots from CSV or JSON (requires x-admin-key).
 *
 * **CSV:** `Content-Type: text/csv` or `text/plain` — body is CSV text
 * (columns: item_id, period_type, period_start, quantity_available; optional quantity_sold column ignored).
 *
 * **JSON:** `Content-Type: application/json` — either `[{...}, ...]` or `{ "rows": [...] }`
 * with the same fields as CSV rows.
 */
export async function POST(req: NextRequest) {
	const err = requireAdmin(req);
	if (err) return err;

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
	let created = 0;
	let updated = 0;

	for (let i = 0; i < rowsResult.rows.length; i++) {
		const rawRow = rowsResult.rows[i]!;
		const v = validateBulkRow(rawRow, i);
		if (!v.ok) {
			errors.push({ index: v.index, message: v.message });
			continue;
		}
		const up = await upsertInventorySlot(v.row);
		if (!up.ok) {
			errors.push({ index: i, message: up.error });
			continue;
		}
		if (up.created) created++;
		else updated++;
	}

	return NextResponse.json({
		created,
		updated,
		errors,
		processed: rowsResult.rows.length,
	});
}
