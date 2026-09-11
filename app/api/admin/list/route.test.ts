import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockFrom, mockRequireAdmin, mockSelect } = vi.hoisted(() => ({
	mockFrom: vi.fn(),
	mockRequireAdmin: vi.fn(),
	mockSelect: vi.fn(),
}));

vi.mock("@/lib/adminAuth", () => ({ requireAdmin: mockRequireAdmin }));
vi.mock("@/lib/supabaseAdmin", () => ({
	getSupabaseAdmin: () => ({ from: mockFrom }),
}));

import { GET } from "./route";

const validRow = {
	id: "ord_internal",
	tracking_token: "f3d4ec4e-f6c8-4dc1-b5f8-5d2fba9a8d4a",
	created_at: "2026-09-08T20:00:00.000Z",
	status: "IN_PROGRESS",
	payload: {
		customer: { name: "Alice Baker", email: "alice@example.com", phone: "555-0100", notes: "Baker needs this" },
		payment: { method: "zelle", status: "PENDING" },
		pickup: { windowId: "window-1", startAt: "2026-09-19T01:42:00.000Z", endAt: "2026-09-19T02:25:00.000Z" },
		items: [{ productId: "cake", name: "Chocolate Cake", unitPriceCents: 2500, quantity: 1, lineTotalCents: 2500 }],
		totals: { subtotalCents: 2500, totalCents: 2500 },
	},
};

function mockOrders(rows: unknown[]) {
	const result = { data: rows, error: null };
	const query = {
		order: vi.fn().mockReturnThis(),
		eq: vi.fn().mockReturnThis(),
		then: (resolve: (value: typeof result) => unknown, reject: (reason: unknown) => unknown) =>
			Promise.resolve(result).then(resolve, reject),
	};
	mockSelect.mockReturnValue(query);
	mockFrom.mockReturnValue({ select: mockSelect });
}

describe("GET /api/admin/list", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRequireAdmin.mockResolvedValue({
			authorized: true,
			admin: { id: "admin-1", email: "owner@example.com" },
		});
	});

	it("does not query the privileged database when authentication fails", async () => {
		mockRequireAdmin.mockResolvedValue({
			authorized: false,
			response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
		});

		const response = await GET(new NextRequest("http://localhost/api/admin/list"));

		expect(response.status).toBe(401);
		expect(mockFrom).not.toHaveBeenCalled();
	});

	it("keeps customer details and provides the tracking token to authenticated admins", async () => {
		mockOrders([validRow]);

		const response = await GET(new NextRequest("http://localhost/api/admin/list"));
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(mockSelect).toHaveBeenCalledWith("id, tracking_token, created_at, status, payload");
		expect(body[0]).toMatchObject({
			id: "ord_internal",
			trackingToken: "f3d4ec4e-f6c8-4dc1-b5f8-5d2fba9a8d4a",
			customer: { name: "Alice Baker", email: "alice@example.com", phone: "555-0100", notes: "Baker needs this" },
			fulfillmentStatus: "IN_PROGRESS",
			payment: { method: "zelle", status: "PENDING" },
			pickup: { windowId: "window-1", startAt: "2026-09-19T01:42:00.000Z", endAt: "2026-09-19T02:25:00.000Z" },
			totals: { subtotalCents: 2500, totalCents: 2500 },
		});
	});

	it.each([
		["payment", { ...validRow, id: "ord_missing_payment", payload: { ...validRow.payload, payment: undefined } }],
		["totals", { ...validRow, id: "ord_missing_totals", payload: { ...validRow.payload, totals: undefined } }],
	])("omits an order missing required %s data without failing the request", async (_field, malformedRow) => {
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
		mockOrders([malformedRow]);

		const response = await GET(new NextRequest("http://localhost/api/admin/list"));
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body).toEqual([]);
		expect(errorSpy).toHaveBeenCalledWith(
			"[admin/orders] omitted malformed order",
			expect.objectContaining({ orderId: malformedRow.id }),
		);
		errorSpy.mockRestore();
	});

	it("returns valid orders when another persisted order is malformed", async () => {
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
		const malformedRow = {
			...validRow,
			id: "ord_missing_payment",
			payload: { ...validRow.payload, payment: undefined },
		};
		mockOrders([validRow, malformedRow]);

		const response = await GET(new NextRequest("http://localhost/api/admin/list"));
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body).toHaveLength(1);
		expect(body[0].id).toBe(validRow.id);
		expect(errorSpy).toHaveBeenCalledTimes(1);
		errorSpy.mockRestore();
	});
});
