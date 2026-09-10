import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockFrom, mockRequireAdmin } = vi.hoisted(() => ({ mockFrom: vi.fn(), mockRequireAdmin: vi.fn() }));
vi.mock("@/lib/adminAuth", () => ({ requireAdmin: mockRequireAdmin }));
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdmin: () => ({ from: mockFrom }) }));

import { POST } from "./route";

function request(body: unknown) {
	return new NextRequest("http://localhost/api/admin/pickup-windows", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

describe("POST /api/admin/pickup-windows", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockRequireAdmin.mockResolvedValue({ authorized: true, admin: { id: "admin" } });
	});

	it("allows an admin to create a minute-precise Pacific pickup window", async () => {
		const single = vi.fn().mockResolvedValue({ data: { id: "window-1" }, error: null });
		const select = vi.fn(() => ({ single }));
		const insert = vi.fn(() => ({ select }));
		mockFrom.mockReturnValue({ insert });

		const response = await POST(request({ date: "2099-09-18", startTime: "18:42", endTime: "19:25" }));

		expect(response.status).toBe(201);
		expect(insert).toHaveBeenCalledWith({
			start_at: "2099-09-19T01:42:00.000Z",
			end_at: "2099-09-19T02:25:00.000Z",
			enabled: true,
		});
	});

	it("rejects equal or reversed times", async () => {
		const response = await POST(request({ date: "2099-09-18", startTime: "18:42", endTime: "18:42" }));
		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: "End time must be after start time." });
		expect(mockFrom).not.toHaveBeenCalled();
	});

	it("rejects an unauthenticated mutation before database access", async () => {
		mockRequireAdmin.mockResolvedValue({ authorized: false, response: new Response(null, { status: 401 }) });
		const response = await POST(request({ date: "2099-09-18", startTime: "18:42", endTime: "19:25" }));
		expect(response.status).toBe(401);
		expect(mockFrom).not.toHaveBeenCalled();
	});
});
