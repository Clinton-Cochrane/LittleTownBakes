import { describe, it, expect } from "vitest";
import {
	parseCsvLine,
	parseInventoryCsv,
	stringifyInventoryCsv,
	validateBulkRow,
	parseInventoryBulkJson,
	type InventoryBulkRow,
} from "./inventoryBulk";
import type { InventorySlot } from "./inventory";

describe("parseCsvLine", () => {
	it("splits simple comma fields", () => {
		expect(parseCsvLine("a,b,c,d")).toEqual(["a", "b", "c", "d"]);
	});

	it("handles quoted commas", () => {
		expect(parseCsvLine('"a,b",week,2025-03-01,5')).toEqual(["a,b", "week", "2025-03-01", "5"]);
	});
});

describe("parseInventoryCsv", () => {
	it("parses rows and skips header", () => {
		const csv = `item_id,period_type,period_start,quantity_available
cake,week,2025-03-10,12
pie,month,2025-03-01,3`;
		const r = parseInventoryCsv(csv);
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.rows).toHaveLength(2);
		expect(r.rows[0]).toMatchObject({
			item_id: "cake",
			period_type: "week",
			period_start: "2025-03-10",
			quantity_available: 12,
		});
	});

	it("strips BOM", () => {
		const csv = "\uFEFFitem_id,period_type,period_start,quantity_available\nx,week,2025-03-10,1";
		const r = parseInventoryCsv(csv);
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.rows[0]?.item_id).toBe("x");
	});

	it("rejects empty file", () => {
		const r = parseInventoryCsv("");
		expect(r.ok).toBe(false);
	});

	it("parses 5-column template with item_name", () => {
		const csv = `item_id,item_name,period_type,period_start,quantity_available
brownie,Brownie bite,week,2025-03-10,5`;
		const r = parseInventoryCsv(csv);
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.rows[0]).toMatchObject({
			item_id: "brownie",
			period_type: "week",
			period_start: "2025-03-10",
			quantity_available: 5,
		});
	});

	it("parses 5-column export round-trip (period in column 2)", () => {
		const csv = `item_id,period_type,period_start,quantity_available,quantity_sold
cake,week,2025-03-10,5,2`;
		const r = parseInventoryCsv(csv);
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.rows[0]).toMatchObject({
			item_id: "cake",
			period_type: "week",
			period_start: "2025-03-10",
			quantity_available: 5,
		});
	});
});

describe("stringifyInventoryCsv / round-trip", () => {
	it("exports and re-parses", () => {
		const slots: InventorySlot[] = [
			{
				id: "u1",
				item_id: "cake",
				period_type: "week",
				period_start: "2025-03-10",
				quantity_available: 5,
				quantity_sold: 2,
			},
		];
		const csv = stringifyInventoryCsv(slots);
		const r = parseInventoryCsv(csv);
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.rows[0]).toMatchObject({
			item_id: "cake",
			period_type: "week",
			period_start: "2025-03-10",
			quantity_available: 5,
		});
	});
});

describe("validateBulkRow", () => {
	it("accepts valid row", () => {
		const row: InventoryBulkRow = {
			item_id: "a",
			period_type: "week",
			period_start: "2025-01-01",
			quantity_available: 0,
		};
		const v = validateBulkRow(row, 0);
		expect(v.ok).toBe(true);
		if (!v.ok) return;
		expect(v.row.quantity_available).toBe(0);
	});

	it("normalizes period casing", () => {
		const row: InventoryBulkRow = {
			item_id: "a",
			period_type: "Week" as InventoryBulkRow["period_type"],
			period_start: "2025-01-01",
			quantity_available: 1,
		};
		const v = validateBulkRow(row, 0);
		expect(v.ok).toBe(true);
		if (!v.ok) return;
		expect(v.row.period_type).toBe("week");
	});

	it("rejects bad date", () => {
		const row: InventoryBulkRow = {
			item_id: "a",
			period_type: "week",
			period_start: "01-01-2025",
			quantity_available: 1,
		};
		const v = validateBulkRow(row, 0);
		expect(v.ok).toBe(false);
	});
});

describe("parseInventoryBulkJson", () => {
	it("parses array of objects", () => {
		const r = parseInventoryBulkJson([
			{ item_id: "x", period_type: "week", period_start: "2025-03-01", quantity_available: 2 },
		]);
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.rows[0]?.item_id).toBe("x");
	});

	it("rejects non-array", () => {
		const r = parseInventoryBulkJson({});
		expect(r.ok).toBe(false);
	});
});
