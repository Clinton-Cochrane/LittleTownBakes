import { describe, expect, it, vi } from "vitest";
import { ResendEmailProvider } from "./resend";

describe("ResendEmailProvider", () => {
	it("keeps credentials in the authorization header and uses provider idempotency", async () => {
		const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "email_1" }), { status: 200 }));
		const provider = new ResendEmailProvider("server-secret", fetch);

		await provider.send({
			from: "orders@bakery.example", to: "baker@example.com", subject: "New order", text: "Order", html: "<p>Order</p>", idempotencyKey: "new-order:ord_1:email",
		});

		const [, init] = fetch.mock.calls[0];
		expect(init.headers).toMatchObject({ Authorization: "Bearer server-secret", "Idempotency-Key": "new-order:ord_1:email" });
		expect(init.body).not.toContain("server-secret");
	});

	it("rejects provider errors without exposing credentials", async () => {
		const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "invalid sender" }), { status: 422 }));
		const provider = new ResendEmailProvider("server-secret", fetch);

		await expect(provider.send({
			from: "bad", to: "baker@example.com", subject: "New order", text: "Order", html: "<p>Order</p>", idempotencyKey: "new-order:ord_1:email",
		})).rejects.toThrow("Resend email failed (422): invalid sender");
	});
});
