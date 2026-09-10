import { describe, expect, it, vi } from "vitest";
import { EmailChannel, PushChannel, SmsChannel } from "./channels";
import type { OrderNotification } from "./types";

const notification: OrderNotification = {
	eventKey: "new-order:ord_123",
	type: "new-order",
	adminUrl: "https://bakery.example/admin/orders",
	order: {
		id: "ord_123", createdAt: "2026-09-10T18:00:00.000Z", fulfillmentStatus: "RECEIVED",
		customer: { name: "Alice <Baker>", email: "alice@example.com", phone: "555-0100", notes: "Pickup after 4 & ring bell" },
		payment: { method: "cash", status: "PENDING" },
		items: [{ productId: "cake", name: "Chocolate & Vanilla", unitPriceCents: 2500, quantity: 2, lineTotalCents: 5000 }],
		totals: { subtotalCents: 5000, totalCents: 5000 },
	},
};

describe("notification channels", () => {
	it("renders baker-facing authoritative order details for email", async () => {
		const send = vi.fn().mockResolvedValue({ id: "email_1" });
		const email = new EmailChannel({ send }, { from: "Little Town Bakes <orders@bakery.example>", to: "baker@example.com" });

		await email.send(notification);

		expect(send).toHaveBeenCalledWith(expect.objectContaining({
			from: "Little Town Bakes <orders@bakery.example>",
			to: "baker@example.com",
			subject: expect.stringContaining("ord_123"),
			html: expect.stringContaining("Alice &lt;Baker&gt;"),
			idempotencyKey: "new-order:ord_123:email",
		}));
		const message = send.mock.calls[0][0];
		expect(message.text).toContain("Alice <Baker>");
		expect(message.text).toContain("Pickup after 4 & ring bell");
		expect(message.text).toContain("Chocolate & Vanilla x 2 — $50.00");
		expect(message.text).toContain("Payment: cash (PENDING)");
		expect(message.text).toContain("Admin orders: https://bakery.example/admin/orders");
	});

	it("provides independently injectable push and SMS provider seams", async () => {
		const pushSend = vi.fn().mockResolvedValue(undefined);
		const smsSend = vi.fn().mockResolvedValue(undefined);
		await new PushChannel({ send: pushSend }).send(notification);
		await new SmsChannel({ send: smsSend }, { to: "+15550100" }).send(notification);

		expect(pushSend).toHaveBeenCalledWith(expect.objectContaining({ eventKey: "new-order:ord_123:push", orderId: "ord_123" }));
		expect(smsSend).toHaveBeenCalledWith(expect.objectContaining({ eventKey: "new-order:ord_123:sms", to: "+15550100" }));
	});
});
