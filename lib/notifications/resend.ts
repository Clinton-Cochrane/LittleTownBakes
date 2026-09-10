import type { EmailMessage, EmailProvider } from "./types";

type Fetch = typeof globalThis.fetch;

export class ResendEmailProvider implements EmailProvider {
	constructor(private readonly apiKey: string, private readonly fetch: Fetch = globalThis.fetch) {}

	async send(message: EmailMessage): Promise<{ id?: string }> {
		const response = await this.fetch("https://api.resend.com/emails", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${this.apiKey}`,
				"Content-Type": "application/json",
				"Idempotency-Key": message.idempotencyKey,
			},
			body: JSON.stringify({
				from: message.from,
				to: [message.to],
				subject: message.subject,
				text: message.text,
				html: message.html,
			}),
		});
		const body = await response.json().catch(() => ({})) as { id?: string; message?: string };
		if (!response.ok) {
			throw new Error(`Resend email failed (${response.status}): ${body.message ?? "unknown provider error"}`);
		}
		return { id: body.id };
	}
}
