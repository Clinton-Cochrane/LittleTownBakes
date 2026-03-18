import { describe, it, expect } from "vitest";
import { validateFlavorRequestPayload } from "./flavorRequestValidation";

describe("validateFlavorRequestPayload", () => {
	it("rejects empty body", () => {
		expect(validateFlavorRequestPayload(null).ok).toBe(false);
		expect(validateFlavorRequestPayload(undefined).ok).toBe(false);
	});

	it("rejects missing item_id", () => {
		const result = validateFlavorRequestPayload({
			customer_email: "a@b.com",
		});
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toContain("item_id");
	});

	it("rejects invalid email", () => {
		const result = validateFlavorRequestPayload({
			item_id: "cake",
			customer_email: "invalid",
		});
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error).toContain("email");
	});

	it("accepts valid minimal payload", () => {
		const result = validateFlavorRequestPayload({
			item_id: "cupcake_redvelvet",
			customer_email: "customer@example.com",
		});
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.item_id).toBe("cupcake_redvelvet");
			expect(result.data.customer_email).toBe("customer@example.com");
			expect(result.data.customer_name).toBeNull();
			expect(result.data.notes).toBeNull();
		}
	});

	it("accepts payload with optional fields", () => {
		const result = validateFlavorRequestPayload({
			item_id: "cake",
			customer_email: "a@b.com",
			customer_name: "Alice",
			notes: "Would love this for my birthday",
		});
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.customer_name).toBe("Alice");
			expect(result.data.notes).toBe("Would love this for my birthday");
		}
	});
});
