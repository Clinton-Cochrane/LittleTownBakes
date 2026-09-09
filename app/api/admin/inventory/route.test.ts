import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockRequireAdmin, mockSetProductInventory } = vi.hoisted(() => ({
	mockRequireAdmin: vi.fn(),
	mockSetProductInventory: vi.fn(),
}));

vi.mock("@/lib/adminAuth", () => ({ requireAdmin: mockRequireAdmin }));
vi.mock("@/lib/inventoryUpsert", () => ({ setProductInventory: mockSetProductInventory }));
vi.mock("@/lib/supabaseAdmin", () => ({ supabaseAdmin: {} }));

import { POST } from "./route";

function request(body: unknown) {
	return new NextRequest("http://localhost/api/admin/inventory", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

describe("POST /api/admin/inventory", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRequireAdmin.mockResolvedValue({ authorized: true, admin: { id: "admin" } });
		mockSetProductInventory.mockImplementation(async (input) => ({ ok: true, data: input }));
	});

	it("sets an absolute current on-hand quantity", async () => {
		const response = await POST(request({ product_id: "cake", quantity_on_hand: 18 }));

		expect(response.status).toBe(200);
		expect(mockSetProductInventory).toHaveBeenCalledWith({
			product_id: "cake",
			quantity_on_hand: 18,
		});
	});

	it.each([-1, 1.5, Number.NaN])("rejects invalid quantity %s", async (quantity) => {
		const response = await POST(request({ product_id: "cake", quantity_on_hand: quantity }));

		expect(response.status).toBe(400);
		expect(mockSetProductInventory).not.toHaveBeenCalled();
	});
});
