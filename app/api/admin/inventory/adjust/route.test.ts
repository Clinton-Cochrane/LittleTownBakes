import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const { mockRequireAdmin, mockAdjustProductInventory } = vi.hoisted(() => ({
	mockRequireAdmin: vi.fn(),
	mockAdjustProductInventory: vi.fn(),
}));

vi.mock("@/lib/adminAuth", () => ({ requireAdmin: mockRequireAdmin, requireWritableAdmin: mockRequireAdmin }));
vi.mock("@/lib/inventoryUpsert", () => ({ adjustProductInventory: mockAdjustProductInventory }));

import { POST } from "./route";

function request(body: unknown) {
	return new NextRequest("http://localhost/api/admin/inventory/adjust", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

describe("POST /api/admin/inventory/adjust", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRequireAdmin.mockResolvedValue({ authorized: true, admin: { id: "admin" } });
		mockAdjustProductInventory.mockResolvedValue({
			ok: true,
			data: { product_id: "cake", quantity_on_hand: 6 },
		});
	});

	it("requires admin authentication", async () => {
		mockRequireAdmin.mockResolvedValue({
			authorized: false,
			response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
		});

		const response = await POST(request({ product_id: "cake", delta: 1 }));

		expect(response.status).toBe(401);
		expect(mockAdjustProductInventory).not.toHaveBeenCalled();
	});

	it.each([1, -1, 12])("atomically applies delta %s and returns authoritative stock", async (delta) => {
		const response = await POST(request({ product_id: "cake", delta }));

		expect(response.status).toBe(200);
		expect(mockAdjustProductInventory).toHaveBeenCalledWith("cake", delta);
		expect(await response.json()).toEqual({ product_id: "cake", quantity_on_hand: 6 });
	});

	it.each([-1.5, Number.NaN, 2_147_483_648])("rejects invalid delta %s", async (delta) => {
		const response = await POST(request({ product_id: "cake", delta }));

		expect(response.status).toBe(400);
		expect(mockAdjustProductInventory).not.toHaveBeenCalled();
	});

	it("returns a nontechnical conflict when decrement would go below zero", async () => {
		mockAdjustProductInventory.mockResolvedValue({
			ok: false,
			status: 409,
			error: "There is not enough available to make that change.",
		});

		const response = await POST(request({ product_id: "cake", delta: -1 }));

		expect(response.status).toBe(409);
		expect(await response.json()).toEqual({ error: "There is not enough available to make that change." });
	});
});
