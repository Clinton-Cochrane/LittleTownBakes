import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }));

vi.mock("@/lib/supabaseAdmin", () => ({
	getSupabaseAdmin: () => ({ rpc: mockRpc }),
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
		mockRpc.mockResolvedValue({ error: null });
	});

	it("always creates through the atomic inventory RPC", async () => {
		const response = await POST(orderRequest());
		const body = await response.json();
		const rpcArgs = mockRpc.mock.calls[0][1];

		expect(response.status).toBe(201);
		expect(mockRpc).toHaveBeenCalledTimes(1);
		expect(mockRpc).toHaveBeenCalledWith("create_order_with_reserve", expect.objectContaining({
			p_order_id: expect.stringMatching(/^ord_/),
			p_tracking_token: body.trackingToken,
			p_items: [{ id: "cake", qty: 1 }],
		}));
		expect(rpcArgs.p_tracking_token).not.toBe(rpcArgs.p_order_id);
	});

	it("fails closed when the reservation RPC rejects the order", async () => {
		mockRpc.mockResolvedValue({ data: null, error: { message: "Item cake: inventory state is missing" } });

		const response = await POST(orderRequest());

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: "Item cake: inventory state is missing" });
	});
});
