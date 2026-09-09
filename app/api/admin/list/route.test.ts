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
		const result = {
			data: [{
				id: "ord_internal",
				tracking_token: "f3d4ec4e-f6c8-4dc1-b5f8-5d2fba9a8d4a",
				created_at: "2026-09-08T20:00:00.000Z",
				status: "PAID",
				payload: {
					customer: { name: "Alice Baker", email: "alice@example.com", phone: "555-0100", notes: "Baker needs this" },
					items: [{ id: "cake", name: "Chocolate Cake", price: 25, qty: 1 }],
					totals: { subtotal: 25, tax: 0, total: 25 },
				},
			}],
			error: null,
		};
		const query = {
			order: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			then: (resolve: (value: typeof result) => unknown, reject: (reason: unknown) => unknown) =>
				Promise.resolve(result).then(resolve, reject),
		};
		mockSelect.mockReturnValue(query);
		mockFrom.mockReturnValue({ select: mockSelect });

		const response = await GET(new NextRequest("http://localhost/api/admin/list"));
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(mockSelect).toHaveBeenCalledWith("id, tracking_token, created_at, status, payload");
		expect(body[0]).toMatchObject({
			id: "ord_internal",
			trackingToken: "f3d4ec4e-f6c8-4dc1-b5f8-5d2fba9a8d4a",
			customer: { name: "Alice Baker", email: "alice@example.com", phone: "555-0100", notes: "Baker needs this" },
		});
	});
});
