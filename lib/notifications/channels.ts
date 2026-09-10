import type {
	EmailMessage, EmailProvider, NotificationChannel, OrderNotification, PushProvider, SmsProvider,
} from "./types";

function currency(cents: number): string {
	return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function escapeHtml(value: string): string {
	return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function eventTitle(notification: OrderNotification): string {
	return notification.type === "new-order"
		? `New order ${notification.order.id}`
		: `Order ${notification.order.id} is ${notification.order.fulfillmentStatus.replaceAll("_", " ").toLowerCase()}`;
}

function renderEmail(notification: OrderNotification, from: string, to: string): EmailMessage {
	const { order } = notification;
	const itemLines = order.items.map((item) => `${item.name} x ${item.quantity} — ${currency(item.lineTotalCents)}`);
	const detailLines = [
		`Order: ${order.id}`,
		`Created: ${order.createdAt}`,
		`Customer: ${order.customer.name}`,
		`Email: ${order.customer.email}`,
		order.customer.phone ? `Phone: ${order.customer.phone}` : undefined,
		order.customer.notes ? `Customer notes / pickup information: ${order.customer.notes}` : undefined,
		"",
		"Items:",
		...itemLines,
		"",
		`Subtotal: ${currency(order.totals.subtotalCents)}`,
		`Total: ${currency(order.totals.totalCents)}`,
		`Payment: ${order.payment.method} (${order.payment.status})`,
		`Fulfillment: ${order.fulfillmentStatus}`,
		order.payment.venmoUser ? `Venmo user: ${order.payment.venmoUser}` : undefined,
		order.payment.note ? `Payment note: ${order.payment.note}` : undefined,
		order.customer.notes ? undefined : "Pickup information: not specified on this order",
		notification.adminUrl ? `Admin orders: ${notification.adminUrl}` : undefined,
	].filter((line): line is string => line !== undefined);
	const text = detailLines.join("\n");
	const html = `<h1>${escapeHtml(eventTitle(notification))}</h1><pre style="font-family: sans-serif; white-space: pre-wrap">${escapeHtml(text)}</pre>`;

	return {
		from,
		to,
		subject: eventTitle(notification),
		text,
		html,
		idempotencyKey: `${notification.eventKey}:email`,
	};
}

export class EmailChannel implements NotificationChannel {
	readonly name = "email" as const;

	constructor(private readonly provider: EmailProvider, private readonly config: { from: string; to: string }) {}

	async send(notification: OrderNotification): Promise<void> {
		await this.provider.send(renderEmail(notification, this.config.from, this.config.to));
	}
}

export class PushChannel implements NotificationChannel {
	readonly name = "push" as const;

	constructor(private readonly provider: PushProvider) {}

	async send(notification: OrderNotification): Promise<void> {
		await this.provider.send({
			title: eventTitle(notification),
			body: `${notification.order.customer.name} · ${currency(notification.order.totals.totalCents)}`,
			eventKey: `${notification.eventKey}:push`,
			orderId: notification.order.id,
			adminUrl: notification.adminUrl,
		});
	}
}

export class SmsChannel implements NotificationChannel {
	readonly name = "sms" as const;

	constructor(private readonly provider: SmsProvider, private readonly config: { to: string }) {}

	async send(notification: OrderNotification): Promise<void> {
		const adminLink = notification.adminUrl ? ` ${notification.adminUrl}` : "";
		await this.provider.send({
			to: this.config.to,
			body: `${eventTitle(notification)}: ${notification.order.customer.name}, ${currency(notification.order.totals.totalCents)}.${adminLink}`,
			eventKey: `${notification.eventKey}:sms`,
		});
	}
}
