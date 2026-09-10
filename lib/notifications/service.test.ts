import { describe, expect, it, vi } from "vitest";
import type { NotificationChannel } from "./types";
import { NotificationService } from "./service";

const order = {
	id: "ord_authoritative",
	createdAt: "2026-09-10T18:00:00.000Z",
	fulfillmentStatus: "RECEIVED" as const,
	payment: { method: "venmo" as const, status: "PAID" as const, venmoUser: "@alice" },
	customer: { name: "Alice Baker", email: "alice@example.com", phone: "555-0100", notes: "Friday pickup" },
	items: [{ productId: "cake", name: "Chocolate Cake", unitPriceCents: 2500, quantity: 2, lineTotalCents: 5000 }],
	totals: { subtotalCents: 5000, totalCents: 5000 },
};

function channel(name: NotificationChannel["name"], send: NotificationChannel["send"]): NotificationChannel {
	return { name, send };
}

describe("NotificationService", () => {
	it("invokes every configured channel with authoritative order content", async () => {
		const email = vi.fn().mockResolvedValue(undefined);
		const push = vi.fn().mockResolvedValue(undefined);
		const sms = vi.fn().mockResolvedValue(undefined);
		const service = new NotificationService([
			channel("email", email), channel("push", push), channel("sms", sms),
		], { adminOrdersUrl: "https://bakery.example/admin/orders" });

		const results = await service.notifyNewOrder(order);

		expect(results).toEqual([
			{ channel: "email", status: "fulfilled" },
			{ channel: "push", status: "fulfilled" },
			{ channel: "sms", status: "fulfilled" },
		]);
		for (const send of [email, push, sms]) {
			expect(send).toHaveBeenCalledWith(expect.objectContaining({
				eventKey: "new-order:ord_authoritative",
				type: "new-order",
				order,
				adminUrl: "https://bakery.example/admin/orders",
			}));
		}
	});

	it("isolates an SMS failure from successful email and push delivery", async () => {
		const email = vi.fn().mockResolvedValue(undefined);
		const push = vi.fn().mockResolvedValue(undefined);
		const sms = vi.fn().mockRejectedValue(new Error("SMS unavailable"));
		const logger = { info: vi.fn(), error: vi.fn() };
		const service = new NotificationService([
			channel("email", email), channel("sms", sms), channel("push", push),
		], { logger });

		await expect(service.notifyNewOrder(order)).resolves.toEqual([
			{ channel: "email", status: "fulfilled" },
			{ channel: "sms", status: "rejected", error: "SMS unavailable" },
			{ channel: "push", status: "fulfilled" },
		]);
		expect(email).toHaveBeenCalledOnce();
		expect(push).toHaveBeenCalledOnce();
		expect(logger.error).toHaveBeenCalledWith("[notifications] channel failed", {
			channel: "sms", eventKey: "new-order:ord_authoritative", error: "SMS unavailable",
		});
	});

	it("isolates an email failure and still attempts push and SMS", async () => {
		const email = vi.fn().mockRejectedValue(new Error("Email unavailable"));
		const push = vi.fn().mockResolvedValue(undefined);
		const sms = vi.fn().mockResolvedValue(undefined);
		const service = new NotificationService([
			channel("email", email), channel("push", push), channel("sms", sms),
		]);

		await expect(service.notifyNewOrder(order)).resolves.toHaveLength(3);
		expect(push).toHaveBeenCalledOnce();
		expect(sms).toHaveBeenCalledOnce();
	});

	it("skips absent channels cleanly and creates a status-specific idempotency key", async () => {
		const email = vi.fn().mockResolvedValue(undefined);
		const service = new NotificationService([channel("email", email)]);

		const results = await service.notifyStatusChange({ ...order, fulfillmentStatus: "IN_PROGRESS" });

		expect(results).toEqual([{ channel: "email", status: "fulfilled" }]);
		expect(email).toHaveBeenCalledWith(expect.objectContaining({
			eventKey: "status-change:ord_authoritative:IN_PROGRESS:PAID",
			type: "status-change",
		}));
	});
});
