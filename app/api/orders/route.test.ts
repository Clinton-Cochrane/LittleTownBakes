import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockNotify, mockRpc } = vi.hoisted(() => ({ mockNotify: vi.fn(), mockRpc: vi.fn() }));
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdmin: () => ({ rpc: mockRpc }) }));
vi.mock("@/lib/notify", () => ({ notifyNewOrder: mockNotify }));
vi.mock("@/lib/rateLimit", () => ({ checkRateLimit: () => null }));
import { POST } from "./route";

const authoritativeOrder = {
	id: "ord_server", createdAt: "2026-09-09T20:00:00.000Z", fulfillmentStatus: "RECEIVED",
	payment: { method: "cash", status: "PENDING" },
	customer: { name: "Alice Baker", email: "alice@example.com" },
	items: [{ productId: "cake", name: "Real Cake", unitPriceCents: 2500, quantity: 2, lineTotalCents: 5000 }],
	totals: { subtotalCents: 5000, totalCents: 5000 },
};

function request(body: unknown) {
	return new NextRequest("http://localhost/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

const trustedRequest = {
	customer: { name: "Alice Baker", email: "alice@example.com" },
	payment: { method: "cash" }, items: [{ productId: "cake", quantity: 2 }],
};

describe("POST /api/orders", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockNotify.mockResolvedValue(undefined);
		mockRpc.mockResolvedValue({ data: { id: "ord_server", order: authoritativeOrder }, error: null });
	});

	it("passes only trusted input to the atomic authoritative RPC and returns its result", async () => {
		const response = await POST(request({ ...trustedRequest,
			items: [{ productId: "cake", quantity: 2, name: "Fake", price: 0 }], totals: { subtotal: 0, total: 0 },
		}));
		const body = await response.json();
		const args = mockRpc.mock.calls[0][1];
		expect(response.status).toBe(201);
		expect(mockRpc).toHaveBeenCalledWith("create_authoritative_order", expect.any(Object));
		expect(args.p_customer).toEqual(trustedRequest.customer);
		expect(args.p_payment).toEqual({ method: "cash" });
		expect(args.p_items).toEqual([{ productId: "cake", quantity: 2 }]);
		expect(JSON.stringify(args)).not.toContain("Fake");
		expect(body).toMatchObject({ trackingToken: expect.any(String), order: authoritativeOrder });
		expect(mockNotify).toHaveBeenCalledWith(authoritativeOrder);
	});

	it.each([["INVALID_PRODUCT", 400], ["PRODUCT_UNAVAILABLE", 409], ["MAX_QUANTITY_EXCEEDED", 400], ["OUT_OF_STOCK", 409]])(
		"maps %s without exposing database details", async (code, status) => {
			mockRpc.mockResolvedValue({ data: null, error: { message: `${code}: secret table detail` } });
			const response = await POST(request(trustedRequest));
			const body = await response.json();
			expect(response.status).toBe(status);
			expect(body).toEqual(expect.objectContaining({ code }));
			expect(JSON.stringify(body)).not.toContain("secret");
		},
	);

	it("uses a generic safe error for unexpected database failures", async () => {
		mockRpc.mockResolvedValue({ data: null, error: { message: "relation products leaked internal detail" } });
		const response = await POST(request(trustedRequest));
		expect(await response.json()).toEqual({ code: "ORDER_FAILED", error: "We could not place your order. Please try again." });
	});
});
