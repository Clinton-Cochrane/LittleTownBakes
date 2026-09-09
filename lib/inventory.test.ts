import { describe, expect, it } from "vitest";
import { getQuantityOnHand, type ProductInventory } from "./inventory";

describe("getQuantityOnHand", () => {
	it("returns the current on-hand quantity", () => {
		const inventory: ProductInventory[] = [
			{ product_id: "cake", quantity_on_hand: 7 },
		];

		expect(getQuantityOnHand(inventory, "cake")).toBe(7);
	});

	it("fails closed when inventory state is missing", () => {
		expect(getQuantityOnHand([], "cake")).toBe(0);
	});
});
