import type { OrderRecord } from "./orderTypes";
import { EmailChannel } from "./notifications/channels";
import { ResendEmailProvider } from "./notifications/resend";
import { NotificationService } from "./notifications/service";
import type { NotificationChannel, NotificationLogger } from "./notifications/types";

type NotificationEnvironment = Record<string, string | undefined>;
type NotificationDependencies = { fetch?: typeof globalThis.fetch; logger?: NotificationLogger };

export function createNotificationServiceFromEnvironment(
	environment: NotificationEnvironment,
	dependencies: NotificationDependencies = {},
): NotificationService {
	const logger = dependencies.logger ?? console;
	const channels: NotificationChannel[] = [];
	if (environment.NODE_ENV === "test" || environment.NOTIFICATIONS_ENABLED !== "true") {
		return new NotificationService(channels, { logger });
	}

	const emailVariables = ["RESEND_API_KEY", "NOTIFICATION_EMAIL_FROM", "BAKER_NOTIFICATION_EMAIL"] as const;
	const configuredEmailVariables = emailVariables.filter((name) => Boolean(environment[name]?.trim()));
	if (configuredEmailVariables.length > 0 && configuredEmailVariables.length < emailVariables.length) {
		logger.error("[notifications] email configuration incomplete", {
			missing: emailVariables.filter((name) => !environment[name]?.trim()),
		});
	} else if (configuredEmailVariables.length === emailVariables.length) {
		channels.push(new EmailChannel(
			new ResendEmailProvider(environment.RESEND_API_KEY!, dependencies.fetch),
			{ from: environment.NOTIFICATION_EMAIL_FROM!, to: environment.BAKER_NOTIFICATION_EMAIL! },
		));
	}

	return new NotificationService(channels, {
		adminOrdersUrl: environment.ADMIN_ORDERS_URL?.trim() || undefined,
		logger,
	});
}

export async function notifyNewOrder(order: OrderRecord) {
	return createNotificationServiceFromEnvironment(process.env).notifyNewOrder(order);
}

export async function notifyStatusChange(order: OrderRecord) {
	return createNotificationServiceFromEnvironment(process.env).notifyStatusChange(order);
}
