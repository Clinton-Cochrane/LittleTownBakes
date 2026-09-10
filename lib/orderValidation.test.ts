import { describe, expect, it } from "vitest";
import { validateOrderPayload } from "./orderValidation";

const validPayload = {
	customer: { name: "Alice Baker", email: "alice@example.com" },
	payment: { method: "cash" },
	items: [{ productId: "cake", quantity: 1 }],
};

describe("validateOrderPayload", () => {
	it("accepts the trusted cash contract and trims customer input", () => {
		const result = validateOrderPayload({
			...validPayload,
			customer: { ...validPayload.customer, name: "  Alice Baker  ", phone: " 555-0100 " },
		});
		expect(result).toEqual({ ok: true, data: {
			customer: { name: "Alice Baker", email: "alice@example.com", phone: "555-0100" },
			payment: { method: "cash" },
			items: [{ productId: "cake", quantity: 1 }],
		} });
	});

	it("accepts Zelle with an optional note", () => {
		expect(validateOrderPayload({ ...validPayload, payment: { method: "zelle", note: "Alice B" } }).ok).toBe(true);
	});

	it("requires a Venmo username", () => {
		expect(validateOrderPayload({ ...validPayload, payment: { method: "venmo" } })).toMatchObject({ ok: false, code: "INVALID_PAYMENT_METHOD" });
		expect(validateOrderPayload({ ...validPayload, payment: { method: "venmo", venmoUser: "@alice" } }).ok).toBe(true);
	});

	it("rejects an invalid payment method", () => {
		expect(validateOrderPayload({ ...validPayload, payment: { method: "card" } })).toMatchObject({ ok: false, code: "INVALID_PAYMENT_METHOD" });
	});

	it.each([0, -1, 1.5])("rejects invalid quantity %s", (quantity) => {
		expect(validateOrderPayload({ ...validPayload, items: [{ productId: "cake", quantity }] })).toMatchObject({ ok: false, code: "INVALID_QUANTITY" });
	});

	it("combines duplicate product IDs before database validation", () => {
		const result = validateOrderPayload({ ...validPayload, items: [
			{ productId: "cake", quantity: 12 }, { productId: "cake", quantity: 12 },
		] });
		expect(result).toMatchObject({ ok: true, data: { items: [{ productId: "cake", quantity: 24 }] } });
	});

	it("ignores untrusted catalog and total fields", () => {
		const result = validateOrderPayload({
			...validPayload, subtotal: 1, total: 1,
			items: [{ productId: "cake", quantity: 1, name: "Fake", price: 0 }],
		});
		expect(result).toMatchObject({ ok: true, data: { items: [{ productId: "cake", quantity: 1 }] } });
	});

	it("rejects malformed customer and item input", () => {
		expect(validateOrderPayload(null).ok).toBe(false);
		expect(validateOrderPayload({ ...validPayload, customer: { name: "A", email: "bad" } }).ok).toBe(false);
		expect(validateOrderPayload({ ...validPayload, items: [] }).ok).toBe(false);
		expect(validateOrderPayload({ ...validPayload, items: [{ productId: "", quantity: 1 }] }).ok).toBe(false);
	});
});
