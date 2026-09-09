import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockFrom, mockInsert, mockInventorySelect, mockRpc } = vi.hoisted(() => ({
	mockFrom: vi.fn(),
	mockInsert: vi.fn(),
	mockInventorySelect: vi.fn(),
	mockRpc: vi.fn(),
}));

vi.mock("@/lib/supabaseAdmin", () => ({
	getSupabaseAdmin: () => ({ from: mockFrom, rpc: mockRpc }),
}));
vi.mock("@/lib/notify", () => ({ notifyNewOrder: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/rateLimit", () => ({ checkRateLimit: () => null }));

import { POST } from "./route";

const payload = {
	customer: { name: "Alice Baker", email: "alice@example.com", paymentMethod: "cash" },
	items: [{ id: "cake", name: "Chocolate Cake", price: 25, qty: 1 }],
	totals: { subtotal: 25, tax: 0, total: 25 },
};

function orderRequest() {
	return new NextRequest("http://localhost/api/orders", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});
}

describe("POST /api/orders", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockFrom.mockImplementation((table: string) => {
			if (table === "inventory_slots") return { select: mockInventorySelect };
			if (table === "orders") return { insert: mockInsert };
			throw new Error(`Unexpected table ${table}`);
		});
		mockRpc.mockResolvedValue({ error: null });
		mockInsert.mockResolvedValue({ error: null });
	});

	it("passes a separate tracking token through the atomic inventory RPC", async () => {
		mockInventorySelect.mockResolvedValue({ data: [{ id: "slot" }] });

		const response = await POST(orderRequest());
		const body = await response.json();
		const rpcArgs = mockRpc.mock.calls[0][1];

		expect(response.status).toBe(201);
		expect(mockRpc).toHaveBeenCalledWith("create_order_with_reserve", expect.objectContaining({
			p_order_id: expect.stringMatching(/^ord_/),
			p_tracking_token: body.trackingToken,
		}));
		expect(body).toEqual({ trackingToken: expect.any(String) });
		expect(rpcArgs.p_tracking_token).not.toBe(rpcArgs.p_order_id);
		expect(body).not.toHaveProperty("id");
	});

	it("stores the tracking token on direct inserts when inventory is not configured", async () => {
		mockInventorySelect.mockResolvedValue({ data: [] });

		const response = await POST(orderRequest());
		const body = await response.json();

		expect(response.status).toBe(201);
		expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
			id: expect.stringMatching(/^ord_/),
			tracking_token: body.trackingToken,
		}));
		expect(body).toEqual({ trackingToken: expect.any(String) });
		expect(body).not.toHaveProperty("id");
	});
});
