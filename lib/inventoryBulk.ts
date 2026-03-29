/**
 * CSV / JSON bulk helpers for inventory_slots import/export.
 */
import type { InventorySlot } from "@/lib/inventory";

export type InventoryBulkRow = {
	item_id: string;
	period_type: "week" | "month";
	period_start: string;
	quantity_available: number;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Normalize values from CSV/JSON before validation. */
export function normalizeBulkRow(row: InventoryBulkRow): InventoryBulkRow {
	const pt = String(row.period_type).trim().toLowerCase();
	return {
		item_id: String(row.item_id).trim(),
		period_type: pt as "week" | "month",
		period_start: String(row.period_start).trim(),
		quantity_available: row.quantity_available,
	};
}

export function validateBulkRow(
	row: InventoryBulkRow,
	index: number
): { ok: true; row: InventoryBulkRow } | { ok: false; index: number; message: string } {
	const n = normalizeBulkRow(row);
	if (!n.item_id) {
		return { ok: false, index, message: "item_id is required" };
	}
	if (n.period_type !== "week" && n.period_type !== "month") {
		return { ok: false, index, message: "period_type must be week or month" };
	}
	if (!DATE_RE.test(n.period_start)) {
		return { ok: false, index, message: "period_start must be YYYY-MM-DD" };
	}
	const q = Number(n.quantity_available);
	if (!Number.isFinite(q) || q < 0) {
		return { ok: false, index, message: "quantity_available must be a non-negative number" };
	}
	return { ok: true, row: { ...n, quantity_available: q } };
}

/** Escape a field for CSV (RFC-style: quote if needed). */
export function escapeCsvField(value: string): string {
	if (/[",\n\r]/.test(value)) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}

/**
 * Parse one CSV line into fields (handles quoted segments).
 */
export function parseCsvLine(line: string): string[] {
	const fields: string[] = [];
	let cur = "";
	let i = 0;
	let inQuotes = false;
	while (i < line.length) {
		const c = line[i];
		if (inQuotes) {
			if (c === '"') {
				if (line[i + 1] === '"') {
					cur += '"';
					i += 2;
					continue;
				}
				inQuotes = false;
				i += 1;
				continue;
			}
			cur += c;
			i += 1;
			continue;
		}
		if (c === '"') {
			inQuotes = true;
			i += 1;
			continue;
		}
		if (c === ",") {
			fields.push(cur);
			cur = "";
			i += 1;
			continue;
		}
		cur += c;
		i += 1;
	}
	fields.push(cur);
	return fields.map((f) => f.trim());
}

export type BulkRowsParseResult =
	| { ok: true; rows: InventoryBulkRow[] }
	| { ok: false; message: string };

/**
 * Parse bulk inventory CSV. Expected columns:
 * item_id, period_type, period_start, quantity_available
 * Optional 5th column quantity_sold (ignored for import).
 */
export function parseInventoryCsv(text: string): BulkRowsParseResult {
	const raw = text.replace(/^\uFEFF/, "");
	const lines = raw.split(/\r?\n/).map((l) => l.trimEnd());
	const rows: InventoryBulkRow[] = [];
	let start = 0;

	if (lines.length === 0 || (lines.length === 1 && lines[0] === "")) {
		return { ok: false, message: "CSV is empty" };
	}

	const first = lines[0] ?? "";
	const firstLower = first.toLowerCase();
	if (
		firstLower.startsWith("item_id") ||
		firstLower.includes("period_type") ||
		firstLower.includes("quantity_available")
	) {
		start = 1;
	}

	for (let li = start; li < lines.length; li++) {
		const line = lines[li]?.trim() ?? "";
		if (!line) continue;
		const fields = parseCsvLine(line);
		if (fields.length < 4) {
			return { ok: false, message: `Line ${li + 1}: need at least 4 columns` };
		}
		let item_id: string;
		let period_type: string;
		let period_start: string;
		let qtyRaw: string;

		if (fields.length === 4) {
			[item_id, period_type, period_start, qtyRaw] = fields;
		} else {
			const second = fields[1]?.trim().toLowerCase() ?? "";
			const isExportStyle = second === "week" || second === "month";
			if (isExportStyle) {
				/** Export: item_id, period_type, period_start, quantity_available, quantity_sold */
				item_id = fields[0]!;
				period_type = fields[1]!;
				period_start = fields[2]!;
				qtyRaw = fields[3]!;
			} else {
				/** Template: item_id, item_name, period_type, period_start, quantity_available */
				if (fields.length < 5) {
					return { ok: false, message: `Line ${li + 1}: need 5 columns when using item_name` };
				}
				item_id = fields[0]!;
				period_type = fields[2]!;
				period_start = fields[3]!;
				qtyRaw = fields[4]!;
			}
		}
		const pt = period_type.trim().toLowerCase();
		if (pt !== "week" && pt !== "month") {
			return { ok: false, message: `Line ${li + 1}: period_type must be week or month` };
		}
		const qty = Number(String(qtyRaw).replace(/,/g, ""));
		if (!Number.isFinite(qty)) {
			return { ok: false, message: `Line ${li + 1}: quantity_available must be a number` };
		}
		rows.push({
			item_id: item_id.trim(),
			period_type: pt,
			period_start: period_start.trim(),
			quantity_available: qty,
		});
	}

	if (rows.length === 0) {
		return { ok: false, message: "No data rows found" };
	}
	return { ok: true, rows };
}

export function stringifyInventoryCsv(slots: InventorySlot[]): string {
	const header = "item_id,period_type,period_start,quantity_available,quantity_sold";
	const lines = slots.map((s) =>
		[
			escapeCsvField(s.item_id),
			escapeCsvField(s.period_type),
			escapeCsvField(s.period_start),
			String(s.quantity_available),
			String(s.quantity_sold),
		].join(",")
	);
	return [header, ...lines].join("\r\n") + "\r\n";
}

/** CSV template: optional human-readable name column for spreadsheets (ignored on import). */
export function stringifyWeekTemplateCsv(
	rows: { item_id: string; item_name: string }[],
	periodStart: string
): string {
	const header = "item_id,item_name,period_type,period_start,quantity_available";
	const lines = rows.map((r) =>
		[
			escapeCsvField(r.item_id),
			escapeCsvField(r.item_name),
			"week",
			escapeCsvField(periodStart),
			"0",
		].join(",")
	);
	return [header, ...lines].join("\r\n") + "\r\n";
}

/**
 * Parse JSON array from bulk import. Each object needs item_id, period_type, period_start, quantity_available.
 */
export function parseInventoryBulkJson(data: unknown): BulkRowsParseResult {
	if (!Array.isArray(data)) {
		return { ok: false, message: "JSON must be an array of row objects" };
	}
	const rows: InventoryBulkRow[] = [];
	for (let i = 0; i < data.length; i++) {
		const item = data[i];
		if (!item || typeof item !== "object") {
			return { ok: false, message: `Row ${i + 1}: must be an object` };
		}
		const o = item as Record<string, unknown>;
		rows.push({
			item_id: String(o.item_id ?? ""),
			period_type: String(o.period_type ?? "") as InventoryBulkRow["period_type"],
			period_start: String(o.period_start ?? ""),
			quantity_available: Number(o.quantity_available),
		});
	}
	if (rows.length === 0) {
		return { ok: false, message: "Array is empty" };
	}
	return { ok: true, rows };
}
