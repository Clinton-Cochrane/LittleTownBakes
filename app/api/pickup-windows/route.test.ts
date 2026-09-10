import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }));
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdmin: () => ({ rpc: mockRpc }) }));

import { GET } from "./route";

describe("GET /api/pickup-windows", () => {
	beforeEach(() => { vi.clearAllMocks(); });

	it("returns only customer-safe pickup fields from authoritative availability", async () => {
		mockRpc.mockResolvedValue({ data: [{
			id: "window-1",
			start_at: "2026-09-19T01:42:00.000Z",
			end_at: "2026-09-19T02:25:00.000Z",
			enabled: true,
			created_at: "private metadata",
		}], error: null });

		const response = await GET();

		expect(response.status).toBe(200);
		expect(mockRpc).toHaveBeenCalledWith("list_available_pickup_windows");
		expect(await response.json()).toEqual([{
			id: "window-1",
			startAt: "2026-09-19T01:42:00.000Z",
			endAt: "2026-09-19T02:25:00.000Z",
		}]);
	});

	it("returns a safe service error when availability cannot be loaded", async () => {
		mockRpc.mockResolvedValue({ data: null, error: { message: "private database detail" } });
		const response = await GET();
		expect(response.status).toBe(503);
		expect(JSON.stringify(await response.json())).not.toContain("private database detail");
	});
});
