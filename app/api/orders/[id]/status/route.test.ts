import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), update: vi.fn(), eqSelect: vi.fn(), eqUpdate: vi.fn(), eqStatus: vi.fn(), maybeSingle: vi.fn(), auth: vi.fn(), notify: vi.fn() }));
vi.mock("@/lib/adminAuth", () => ({ requireAdmin: mocks.auth }));
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdmin: () => ({ from: mocks.from, rpc: mocks.rpc }) }));
vi.mock("@/lib/notify", () => ({ notifyStatusChange: mocks.notify }));
import { POST } from "./route";

function request(body: unknown) { return new NextRequest("http://localhost/api/orders/ord/status", { method: "POST", body: JSON.stringify(body) }); }
describe("POST order status", () => {
	beforeEach(() => {
		vi.clearAllMocks(); mocks.auth.mockResolvedValue({ authorized: true }); mocks.notify.mockResolvedValue(undefined);
		mocks.eqSelect.mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { status: "RECEIVED", payload: {
			id: "ord", createdAt: "2026-09-09", fulfillmentStatus: "RECEIVED", payment: { method: "cash", status: "PENDING" }, customer: { name: "A", email: "a@b.com" }, items: [], totals: { subtotalCents: 0, totalCents: 0 },
		} }, error: null }) });
		mocks.maybeSingle.mockResolvedValue({ data: { id: "ord" }, error: null });
		mocks.eqStatus.mockReturnValue({ select: vi.fn(() => ({ maybeSingle: mocks.maybeSingle })) });
		mocks.eqUpdate.mockReturnValue({ eq: mocks.eqStatus }); mocks.update.mockReturnValue({ eq: mocks.eqUpdate });
		mocks.from.mockReturnValue({ select: vi.fn(() => ({ eq: mocks.eqSelect })), update: mocks.update });
		mocks.rpc.mockResolvedValue({ data: { restored: true }, error: null });
	});
	it("advances fulfillment while payment remains pending", async () => {
		const response = await POST(request({ fulfillmentStatus: "IN_PROGRESS" }), { params: Promise.resolve({ id: "ord" }) });
		expect(response.status).toBe(200);
		expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ status: "IN_PROGRESS", payload: expect.objectContaining({ payment: { method: "cash", status: "PENDING" } }) }));
		expect(mocks.notify).toHaveBeenCalledWith(expect.objectContaining({ id: "ord", fulfillmentStatus: "IN_PROGRESS" }));
	});
	it("keeps a persisted status change successful when notification unexpectedly rejects", async () => {
		mocks.notify.mockRejectedValue(new Error("provider failure"));
		const response = await POST(request({ fulfillmentStatus: "IN_PROGRESS" }), { params: Promise.resolve({ id: "ord" }) });
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ ok: true });
	});
	it("marks payment paid without changing fulfillment or inventory", async () => {
		const response = await POST(request({ paymentStatus: "PAID" }), { params: Promise.resolve({ id: "ord" }) });
		expect(response.status).toBe(200); expect(mocks.rpc).not.toHaveBeenCalled();
		expect(mocks.update).toHaveBeenCalledWith({ payload: expect.objectContaining({ fulfillmentStatus: "RECEIVED", payment: { method: "cash", status: "PAID" } }) });
	});
	it("uses only the restoration RPC for cancellation", async () => {
		const response = await POST(request({ fulfillmentStatus: "CANCELED" }), { params: Promise.resolve({ id: "ord" }) });
		expect(response.status).toBe(200); expect(mocks.rpc).toHaveBeenCalledWith("cancel_order_and_restore_inventory", { p_order_id: "ord" });
		expect(mocks.update).not.toHaveBeenCalled();
	});
	it("returns a safe client error for malformed JSON", async () => {
		const malformed = new NextRequest("http://localhost/api/orders/ord/status", { method: "POST", body: "{" });
		const response = await POST(malformed, { params: Promise.resolve({ id: "ord" }) });
		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: "Invalid JSON body" });
		expect(mocks.from).not.toHaveBeenCalled();
	});
	it.each(["COMPLETED", "CANCELED"])("rejects payment changes after %s", async (status) => {
		mocks.eqSelect.mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { status, payload: {
			id: "ord", createdAt: "2026-09-09", fulfillmentStatus: status,
			payment: { method: "cash", status: "PENDING" }, customer: { name: "A", email: "a@b.com" },
			items: [], totals: { subtotalCents: 0, totalCents: 0 },
		} }, error: null }) });
		const response = await POST(request({ paymentStatus: "PAID" }), { params: Promise.resolve({ id: "ord" }) });
		expect(response.status).toBe(400);
		expect(mocks.update).not.toHaveBeenCalled();
		expect(mocks.rpc).not.toHaveBeenCalled();
	});
});
