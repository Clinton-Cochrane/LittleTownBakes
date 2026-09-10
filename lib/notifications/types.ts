import type { OrderRecord } from "../orderTypes";

export type NotificationChannelName = "email" | "push" | "sms";
export type NotificationEventType = "new-order" | "status-change";

export type OrderNotification = {
	eventKey: string;
	type: NotificationEventType;
	order: OrderRecord;
	adminUrl?: string;
};

export interface NotificationChannel {
	readonly name: NotificationChannelName;
	send(notification: OrderNotification): Promise<void>;
}

export type ChannelDeliveryResult = {
	channel: NotificationChannelName;
	status: "fulfilled" | "rejected";
	error?: string;
};

export interface NotificationLogger {
	info(message: string, context: Record<string, unknown>): void;
	error(message: string, context: Record<string, unknown>): void;
}

export type EmailMessage = {
	from: string;
	to: string;
	subject: string;
	text: string;
	html: string;
	idempotencyKey: string;
};

export interface EmailProvider {
	send(message: EmailMessage): Promise<{ id?: string }>;
}

export type PushMessage = {
	title: string;
	body: string;
	eventKey: string;
	orderId: string;
	adminUrl?: string;
};

export interface PushProvider {
	send(message: PushMessage): Promise<void>;
}

export type SmsMessage = {
	to: string;
	body: string;
	eventKey: string;
};

export interface SmsProvider {
	send(message: SmsMessage): Promise<void>;
}
