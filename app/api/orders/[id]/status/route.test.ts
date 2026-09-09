import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockEqForSelect, mockEqForUpdate, mockFrom, mockRequireAdmin, mockUpdate } = vi.hoisted(() => ({
	mockEqForSelect: vi.fn(),
	mockEqForUpdate: vi.fn(),
	mockFrom: vi.fn(),
	mockRequireAdmin: vi.fn(),
	mockUpdate: vi.fn(),
}));

vi.mock("@/lib/adminAuth", () => ({ requireAdmin: mockRequireAdmin }));
vi.mock("@/lib/supabaseAdmin", () => ({
	getSupabaseAdmin: () => ({ from: mockFrom }),
}));
vi.mock("@/lib/notify", () => ({ notifyStatusChange: vi.fn().mockResolvedValue(undefined) }));

import { POST } from "./route";

describe("POST /api/orders/[id]/status", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRequireAdmin.mockResolvedValue({
			authorized: true,
			admin: { id: "admin-1", email: "owner@example.com" },
		});
		mockEqForSelect.mockReturnValue({
			single: vi.fn().mockResolvedValue({
				data: {
					payload: {
						id: "ord_internal",
						createdAt: "2026-09-08T20:00:00.000Z",
						status: "AWAITING_PAYMENT",
						customer: { name: "Alice", email: "alice@example.com" },
						items: [{ id: "cake", name: "Cake", price: 25, qty: 1 }],
						totals: { subtotal: 25, tax: 0, total: 25 },
					},
				},
				error: null,
			}),
		});
		mockEqForUpdate.mockResolvedValue({ error: null });
		mockUpdate.mockReturnValue({ eq: mockEqForUpdate });
		mockFrom.mockReturnValue({
			select: vi.fn(() => ({ eq: mockEqForSelect })),
			update: mockUpdate,
		});
	});

	it("continues updating status by internal order ID", async () => {
		const response = await POST(
			new NextRequest("http://localhost/api/orders/ord_internal/status", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ status: "PAID" }),
			}),
			{ params: Promise.resolve({ id: "ord_internal" }) },
		);

		expect(response.status).toBe(200);
		expect(mockEqForSelect).toHaveBeenCalledWith("id", "ord_internal");
		expect(mockEqForUpdate).toHaveBeenCalledWith("id", "ord_internal");
		expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: "PAID" }));
	});
});
