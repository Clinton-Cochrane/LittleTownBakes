import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockFrom, mockRequireAdmin, mockRpc } = vi.hoisted(() => ({
	mockFrom: vi.fn(), mockRequireAdmin: vi.fn(), mockRpc: vi.fn(),
}));
vi.mock("@/lib/adminAuth", () => ({ requireAdmin: mockRequireAdmin, requireWritableAdmin: mockRequireAdmin }));
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdmin: () => ({ from: mockFrom, rpc: mockRpc }) }));

import { PATCH } from "./route";

const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
function request(body: unknown) {
	return new NextRequest(`http://localhost/api/admin/pickup-windows/${id}`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

describe("PATCH /api/admin/pickup-windows/[id]", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRequireAdmin.mockResolvedValue({ authorized: true, admin: { id: "admin" } });
	});

	it("allows an admin to edit and disable a pickup window", async () => {
		mockRpc.mockResolvedValue({ data: { id: "replacement-id", enabled: false }, error: null });

		const response = await PATCH(request({
			date: "2099-09-18", startTime: "18:42", endTime: "19:25", enabled: false,
		}), { params: Promise.resolve({ id }) });

		expect(response.status).toBe(200);
		expect(mockRpc).toHaveBeenCalledWith("replace_pickup_window", {
			p_pickup_window_id: id,
			p_start_at: "2099-09-19T01:42:00.000Z",
			p_end_at: "2099-09-19T02:25:00.000Z",
			p_enabled: false,
		});
	});

	it("allows an admin to re-enable a future pickup window", async () => {
		const existingSingle = vi.fn().mockResolvedValue({ data: {
			start_at: "2099-09-19T01:42:00.000Z",
			end_at: "2099-09-19T02:25:00.000Z",
		}, error: null });
		const existingEq = vi.fn(() => ({ single: existingSingle }));
		const existingSelect = vi.fn(() => ({ eq: existingEq }));
		const maybeSingle = vi.fn().mockResolvedValue({ data: { id, enabled: true }, error: null });
		const updateSelect = vi.fn(() => ({ maybeSingle }));
		const updateEq = vi.fn(() => ({ select: updateSelect }));
		const update = vi.fn(() => ({ eq: updateEq }));
		mockFrom
			.mockReturnValueOnce({ select: existingSelect })
			.mockReturnValueOnce({ update });

		const response = await PATCH(request({ enabled: true }), { params: Promise.resolve({ id }) });

		expect(response.status).toBe(200);
		expect(update).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }));
	});

	it("rejects an unauthenticated update before database access", async () => {
		mockRequireAdmin.mockResolvedValue({ authorized: false, response: new Response(null, { status: 401 }) });
		const response = await PATCH(request({ enabled: false }), { params: Promise.resolve({ id }) });
		expect(response.status).toBe(401);
		expect(mockFrom).not.toHaveBeenCalled();
	});
});
