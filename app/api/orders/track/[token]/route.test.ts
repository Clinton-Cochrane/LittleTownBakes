import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const { mockEq, mockFrom } = vi.hoisted(() => ({ mockEq: vi.fn(), mockFrom: vi.fn() }));
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdmin: () => ({ from: mockFrom }) }));
import { GET } from "./route";

const token = "f3d4ec4e-f6c8-4dc1-b5f8-5d2fba9a8d4a";
describe("GET /api/orders/track/[token]", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockEq.mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { status: "RECEIVED", payload: {
			payment: { method: "cash", status: "PENDING" },
			pickup: { windowId: "window-1", startAt: "2026-09-19T01:42:00.000Z", endAt: "2026-09-19T02:25:00.000Z" },
			items: [{ productId: "cake", name: "Cake", unitPriceCents: 2500, quantity: 1, lineTotalCents: 2500 }],
			totals: { subtotalCents: 2500, totalCents: 2500 }, customer: { name: "Private", email: "private@example.com" },
		} }, error: null }) });
		mockFrom.mockReturnValue({ select: vi.fn(() => ({ eq: mockEq })) });
	});
	it("returns protected authoritative purchase-time information", async () => {
		const response = await GET(new NextRequest(`http://localhost/api/orders/track/${token}`), { params: Promise.resolve({ token }) });
		const body = await response.json();
		expect(response.status).toBe(200);
		expect(body).toMatchObject({
			fulfillmentStatus: "RECEIVED",
			payment: { method: "cash", status: "PENDING" },
			pickup: { startAt: "2026-09-19T01:42:00.000Z", endAt: "2026-09-19T02:25:00.000Z" },
			totals: { totalCents: 2500 },
		});
		expect(body).not.toHaveProperty("customer");
		expect(body.pickup).not.toHaveProperty("windowId");
	});
	it("rejects invalid tokens before querying", async () => {
		const response = await GET(new NextRequest("http://localhost/api/orders/track/bad"), { params: Promise.resolve({ token: "bad" }) });
		expect(response.status).toBe(404); expect(mockFrom).not.toHaveBeenCalled();
	});
});
