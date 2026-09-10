import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const rpc = vi.fn();
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdmin: () => ({ rpc }) }));

import { POST } from "./route";

function request(body: unknown) {
	return new NextRequest("http://localhost/api/demand-signals", {
		method: "POST",
		body: JSON.stringify(body),
	});
}

describe("POST /api/demand-signals", () => {
	beforeEach(() => vi.clearAllMocks());

	it("returns the atomically incremented current event count", async () => {
		rpc.mockResolvedValue({ data: [{ event_type: "sold_out", demand_count: 8 }], error: null });
		const response = await POST(request({ productId: "cake" }));
		expect(rpc).toHaveBeenCalledWith("increment_product_demand", { p_product_id: "cake" });
		expect(await response.json()).toEqual({ eventType: "sold_out", currentDemandCount: 8 });
	});

	it.each([
		["DEMAND_PRODUCT_NOT_FOUND", 404, "Product not found"],
		["DEMAND_PRODUCT_AVAILABLE", 409, "This product is currently available"],
	])("maps authoritative rejection %s", async (message, status, expected) => {
		rpc.mockResolvedValue({ data: null, error: { message } });
		const response = await POST(request({ productId: "cake" }));
		expect(response.status).toBe(status);
		expect(await response.json()).toEqual({ error: expected });
	});

	it("rejects a missing product id before calling the database", async () => {
		const response = await POST(request({}));
		expect(response.status).toBe(400);
		expect(rpc).not.toHaveBeenCalled();
	});
});
