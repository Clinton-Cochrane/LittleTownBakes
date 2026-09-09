import { describe, expect, it } from "vitest";
import { createTrackingToken, isValidTrackingToken, toPublicOrderTracking } from "./orderTracking";

describe("public order tracking", () => {
	it("creates distinct cryptographically random UUID tracking tokens", () => {
		const first = createTrackingToken();
		const second = createTrackingToken();

		expect(first).not.toBe(second);
		expect(first.slice(0, 18)).not.toBe(second.slice(0, 18));
		expect(isValidTrackingToken(first)).toBe(true);
		expect(isValidTrackingToken(second)).toBe(true);
	});

	it("builds the exact allowlisted public shape without customer PII or internal fields", () => {
		const publicOrder = toPublicOrderTracking("PAID", {
			items: [{ id: "secret-item-id", name: "Chocolate Cake", price: 25, qty: 2 }],
			totals: { subtotal: 50, tax: 4, total: 54 },
		});

		expect(publicOrder).toEqual({
			status: "PAID",
			items: [{ name: "Chocolate Cake", price: 25, qty: 2 }],
			total: 54,
		});
		for (const field of [
			"id",
			"trackingToken",
			"customer",
			"email",
			"phone",
			"notes",
			"paymentMethod",
			"venmoUser",
			"venmoNote",
			"payload",
		]) {
			expect(publicOrder).not.toHaveProperty(field);
		}
	});
});
