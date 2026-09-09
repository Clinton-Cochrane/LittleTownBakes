import { describe, expect, it } from "vitest";
import {
	parseInventoryBulkJson,
	parseInventoryCsv,
	stringifyInventoryCsv,
	stringifyInventoryTemplateCsv,
	validateBulkRow,
} from "./inventoryBulk";

describe("current inventory bulk helpers", () => {
	it("parses current on-hand CSV", () => {
		const result = parseInventoryCsv("product_id,quantity_on_hand\ncake,12\npie,3");
		expect(result).toEqual({
			ok: true,
			rows: [
				{ product_id: "cake", quantity_on_hand: 12 },
				{ product_id: "pie", quantity_on_hand: 3 },
			],
		});
	});

	it("round-trips exports", () => {
		const csv = stringifyInventoryCsv([{ product_id: "cake", quantity_on_hand: 5 }]);
		expect(parseInventoryCsv(csv)).toEqual({
			ok: true,
			rows: [{ product_id: "cake", quantity_on_hand: 5 }],
		});
	});

	it("creates and parses a product-name template", () => {
		const csv = stringifyInventoryTemplateCsv([{ product_id: "cake", product_name: "Cake, large" }]);
		expect(parseInventoryCsv(csv)).toEqual({
			ok: true,
			rows: [{ product_id: "cake", quantity_on_hand: 0 }],
		});
	});

	it("rejects negative, fractional, and invalid quantities", () => {
		for (const quantity_on_hand of [-1, 1.5, Number.NaN]) {
			expect(validateBulkRow({ product_id: "cake", quantity_on_hand }, 0).ok).toBe(false);
		}
	});

	it("parses JSON rows", () => {
		expect(parseInventoryBulkJson([{ product_id: "cake", quantity_on_hand: 4 }])).toEqual({
			ok: true,
			rows: [{ product_id: "cake", quantity_on_hand: 4 }],
		});
	});
});
