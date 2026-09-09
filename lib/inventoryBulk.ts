import type { ProductInventory } from "@/lib/inventory";

export type InventoryBulkRow = {
	product_id: string;
	quantity_on_hand: number;
};

export function validateBulkRow(
	row: InventoryBulkRow,
	index: number
): { ok: true; row: InventoryBulkRow } | { ok: false; index: number; message: string } {
	const productId = String(row.product_id).trim();
	const quantityOnHand = Number(row.quantity_on_hand);
	if (!productId) return { ok: false, index, message: "product_id is required" };
	if (!Number.isSafeInteger(quantityOnHand) || quantityOnHand < 0 || quantityOnHand > 2147483647) {
		return { ok: false, index, message: "quantity_on_hand must be a non-negative integer" };
	}
	return { ok: true, row: { product_id: productId, quantity_on_hand: quantityOnHand } };
}

export function escapeCsvField(value: string): string {
	return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function parseCsvLine(line: string): string[] {
	const fields: string[] = [];
	let current = "";
	let inQuotes = false;
	for (let i = 0; i < line.length; i++) {
		const character = line[i];
		if (character === '"') {
			if (inQuotes && line[i + 1] === '"') {
				current += '"';
				i++;
			} else {
				inQuotes = !inQuotes;
			}
		} else if (character === "," && !inQuotes) {
			fields.push(current.trim());
			current = "";
		} else {
			current += character;
		}
	}
	fields.push(current.trim());
	return fields;
}

export type BulkRowsParseResult =
	| { ok: true; rows: InventoryBulkRow[] }
	| { ok: false; message: string };

export function parseInventoryCsv(text: string): BulkRowsParseResult {
	const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
	if (lines.length === 0) return { ok: false, message: "CSV is empty" };
	const start = lines[0]?.toLowerCase().includes("product_id") ? 1 : 0;
	const rows: InventoryBulkRow[] = [];
	for (let index = start; index < lines.length; index++) {
		const fields = parseCsvLine(lines[index]!);
		if (fields.length !== 2 && fields.length !== 3) {
			return { ok: false, message: `Line ${index + 1}: expected product_id,quantity_on_hand` };
		}
		const quantity = fields.length === 2 ? fields[1] : fields[2];
		rows.push({ product_id: fields[0]!, quantity_on_hand: quantity === "" ? Number.NaN : Number(quantity) });
	}
	return rows.length > 0 ? { ok: true, rows } : { ok: false, message: "No data rows found" };
}

export function stringifyInventoryCsv(rows: ProductInventory[]): string {
	const lines = rows.map((row) =>
		`${escapeCsvField(row.product_id)},${row.quantity_on_hand}`
	);
	return ["product_id,quantity_on_hand", ...lines].join("\r\n") + "\r\n";
}

export function stringifyInventoryTemplateCsv(
	rows: { product_id: string; product_name: string }[]
): string {
	const lines = rows.map((row) =>
		`${escapeCsvField(row.product_id)},${escapeCsvField(row.product_name)},0`
	);
	return ["product_id,product_name,quantity_on_hand", ...lines].join("\r\n") + "\r\n";
}

export function parseInventoryBulkJson(data: unknown): BulkRowsParseResult {
	if (!Array.isArray(data)) return { ok: false, message: "JSON must be an array of row objects" };
	if (data.length === 0) return { ok: false, message: "Array is empty" };
	const rows: InventoryBulkRow[] = [];
	for (let index = 0; index < data.length; index++) {
		const value = data[index];
		if (!value || typeof value !== "object") {
			return { ok: false, message: `Row ${index + 1}: must be an object` };
		}
		const object = value as Record<string, unknown>;
		rows.push({
			product_id: String(object.product_id ?? ""),
			quantity_on_hand: object.quantity_on_hand === null || object.quantity_on_hand === undefined
				? Number.NaN
				: Number(object.quantity_on_hand),
		});
	}
	return { ok: true, rows };
}
