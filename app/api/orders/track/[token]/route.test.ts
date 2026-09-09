import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockEq, mockFrom, mockSelect, mockSingle } = vi.hoisted(() => {
	const mockSingle = vi.fn();
	const mockEq = vi.fn(() => ({ single: mockSingle }));
	const mockSelect = vi.fn(() => ({ eq: mockEq }));
	const mockFrom = vi.fn(() => ({ select: mockSelect }));
	return { mockEq, mockFrom, mockSelect, mockSingle };
});

vi.mock("@/lib/supabaseAdmin", () => ({
	getSupabaseAdmin: () => ({ from: mockFrom }),
}));

import { GET } from "./route";

const token = "f3d4ec4e-f6c8-4dc1-b5f8-5d2fba9a8d4a";
const privatePayload = {
	id: "ord_internal",
	status: "AWAITING_PAYMENT",
	createdAt: "2026-09-08T20:00:00.000Z",
	customer: {
		name: "Alice Baker",
		email: "alice@example.com",
		phone: "555-0100",
		notes: "Private note",
		paymentMethod: "venmo",
		venmoUser: "@alice",
		venmoNote: "private payment metadata",
	},
	items: [{ id: "cake", name: "Chocolate Cake", price: 25, qty: 2 }],
	totals: { subtotal: 50, tax: 4, total: 54 },
};

function request(value: string) {
	return GET(
		new NextRequest(`http://localhost/api/orders/track/${value}`),
		{ params: Promise.resolve({ token: value }) },
	);
}

describe("GET /api/orders/track/[token]", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns the customer-safe order using the tracking token and database status", async () => {
		mockSingle.mockResolvedValue({
			data: { status: "READY_FOR_PICKUP", payload: privatePayload },
			error: null,
		});

		const response = await request(token);

		expect(response.status).toBe(200);
		expect(response.headers.get("cache-control")).toBe("no-store");
		expect(mockFrom).toHaveBeenCalledWith("orders");
		expect(mockSelect).toHaveBeenCalledWith("status, payload");
		expect(mockEq).toHaveBeenCalledWith("tracking_token", token);
		expect(await response.json()).toEqual({
			status: "READY_FOR_PICKUP",
			items: [{ name: "Chocolate Cake", price: 25, qty: 2 }],
			total: 54,
		});
	});

	it("returns 404 for an unknown random token", async () => {
		mockSingle.mockResolvedValue({ data: null, error: { message: "not found" } });

		const response = await request(token);

		expect(response.status).toBe(404);
		expect(await response.text()).toBe("Not Found");
	});

	it("returns the same 404 for an internal order ID without querying it", async () => {
		const response = await request("ord_mxyz123");

		expect(response.status).toBe(404);
		expect(await response.text()).toBe("Not Found");
		expect(mockFrom).not.toHaveBeenCalled();
	});

	it("handles malformed tracking values with the same safe 404", async () => {
		const response = await request("not-a-token");

		expect(response.status).toBe(404);
		expect(await response.text()).toBe("Not Found");
		expect(mockFrom).not.toHaveBeenCalled();
	});
});
