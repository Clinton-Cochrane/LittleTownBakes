import type { OrderRecord } from "../orderTypes";
import type { ChannelDeliveryResult, NotificationChannel, NotificationLogger, OrderNotification } from "./types";

const defaultLogger: NotificationLogger = console;

function errorMessage(reason: unknown): string {
	if (reason instanceof Error) return reason.message.slice(0, 500);
	return "Unknown channel failure";
}

export class NotificationService {
	readonly configuredChannels: NotificationChannel["name"][];
	private readonly channels: NotificationChannel[];
	private readonly adminOrdersUrl?: string;
	private readonly logger: NotificationLogger;

	constructor(channels: NotificationChannel[], options: { adminOrdersUrl?: string; logger?: NotificationLogger } = {}) {
		this.channels = channels;
		this.configuredChannels = channels.map(({ name }) => name);
		this.adminOrdersUrl = options.adminOrdersUrl;
		this.logger = options.logger ?? defaultLogger;
	}

	notifyNewOrder(order: OrderRecord): Promise<ChannelDeliveryResult[]> {
		return this.dispatch({
			eventKey: `new-order:${order.id}`,
			type: "new-order",
			order,
			adminUrl: this.adminOrdersUrl,
		});
	}

	notifyStatusChange(order: OrderRecord): Promise<ChannelDeliveryResult[]> {
		return this.dispatch({
			eventKey: `status-change:${order.id}:${order.fulfillmentStatus}:${order.payment.status}`,
			type: "status-change",
			order,
			adminUrl: this.adminOrdersUrl,
		});
	}

	private async dispatch(notification: OrderNotification): Promise<ChannelDeliveryResult[]> {
		const attempts = this.channels.map((channel) => Promise.resolve().then(() => channel.send(notification)));
		const settled = await Promise.allSettled(attempts);

		return settled.map((result, index) => {
			const channel = this.channels[index].name;
			if (result.status === "fulfilled") {
				this.logger.info("[notifications] channel delivered", { channel, eventKey: notification.eventKey });
				return { channel, status: "fulfilled" };
			}

			const error = errorMessage(result.reason);
			this.logger.error("[notifications] channel failed", { channel, eventKey: notification.eventKey, error });
			return { channel, status: "rejected", error };
		});
	}
}
