import { describe, it, expect } from "vitest";
import { validateOrderPayload } from "./orderValidation";

describe("validateOrderPayload", () => {
	it("rejects empty body", () => {
		expect(validateOrderPayload(null).ok).toBe(false);
		expect(validateOrderPayload(undefined).ok).toBe(false);
	});

	it("rejects non-object body", () => {
		expect(validateOrderPayload("string").ok).toBe(false);
		expect(validateOrderPayload(123).ok).toBe(false);
	});

	it("rejects missing customer", () => {
		const result = validateOrderPayload({ items: [], totals: {} });
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toContain("customer");
	});

	it("rejects invalid name", () => {
		const base = {
			customer: { name: "A", email: "a@b.com" },
			items: [{ id: "x", name: "Item", price: 1, qty: 1 }],
			totals: { subtotal: 1, tax: 0, total: 1 },
		};
		expect(validateOrderPayload({ ...base, customer: { ...base.customer, name: "A" } }).ok).toBe(false);
		expect(validateOrderPayload({ ...base, customer: { ...base.customer, name: "" } }).ok).toBe(false);
	});

	it("rejects invalid email", () => {
		const base = {
			customer: { name: "Alice", email: "a@b.com" },
			items: [{ id: "x", name: "Item", price: 1, qty: 1 }],
			totals: { subtotal: 1, tax: 0, total: 1 },
		};
		expect(validateOrderPayload({ ...base, customer: { ...base.customer, email: "invalid" } }).ok).toBe(false);
		expect(validateOrderPayload({ ...base, customer: { ...base.customer, email: "" } }).ok).toBe(false);
	});

	it("rejects venmo without venmoUser", () => {
		const base = {
			customer: { name: "Alice", email: "a@b.com", paymentMethod: "venmo" },
			items: [{ id: "x", name: "Item", price: 1, qty: 1 }],
			totals: { subtotal: 1, tax: 0, total: 1 },
		};
		const result = validateOrderPayload(base);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toContain("venmoUser");
	});

	it("accepts venmo with venmoUser", () => {
		const base = {
			customer: { name: "Alice", email: "a@b.com", paymentMethod: "venmo", venmoUser: "@alice" },
			items: [{ id: "x", name: "Item", price: 1, qty: 1 }],
			totals: { subtotal: 1, tax: 0, total: 1 },
		};
		const result = validateOrderPayload(base);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.data.customer.venmoUser).toBe("@alice");
	});

	it("accepts cash without venmoUser", () => {
		const base = {
			customer: { name: "Alice", email: "a@b.com", paymentMethod: "cash" },
			items: [{ id: "x", name: "Item", price: 1, qty: 1 }],
			totals: { subtotal: 1, tax: 0, total: 1 },
		};
		const result = validateOrderPayload(base);
		expect(result.ok).toBe(true);
	});

	it("rejects empty items", () => {
		const base = {
			customer: { name: "Alice", email: "a@b.com", paymentMethod: "cash" },
			items: [],
			totals: { subtotal: 0, tax: 0, total: 0 },
		};
		const result = validateOrderPayload(base);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toContain("empty");
	});

	it("rejects invalid item (negative price)", () => {
		const base = {
			customer: { name: "Alice", email: "a@b.com" },
			items: [{ id: "x", name: "Item", price: -1, qty: 1 }],
			totals: { subtotal: 1, tax: 0, total: 1 },
		};
		expect(validateOrderPayload(base).ok).toBe(false);
	});

	it("rejects invalid item (qty < 1)", () => {
		const base = {
			customer: { name: "Alice", email: "a@b.com" },
			items: [{ id: "x", name: "Item", price: 1, qty: 0 }],
			totals: { subtotal: 1, tax: 0, total: 1 },
		};
		expect(validateOrderPayload(base).ok).toBe(false);
	});

	it("accepts valid minimal order (cash)", () => {
		const payload = {
			customer: { name: "Alice", email: "a@b.com", paymentMethod: "cash" },
			items: [{ id: "cake", name: "Chocolate Cake", price: 25, qty: 1 }],
			totals: { subtotal: 25, tax: 0, total: 25 },
		};
		const result = validateOrderPayload(payload);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.customer.name).toBe("Alice");
			expect(result.data.customer.email).toBe("a@b.com");
			expect(result.data.customer.paymentMethod).toBe("cash");
			expect(result.data.items).toHaveLength(1);
			expect(result.data.items[0]).toEqual({ id: "cake", name: "Chocolate Cake", price: 25, qty: 1 });
		}
	});
});
