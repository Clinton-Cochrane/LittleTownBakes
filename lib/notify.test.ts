import { describe, expect, it, vi } from "vitest";
import { createNotificationServiceFromEnvironment } from "./notify";

describe("notification environment configuration", () => {
	it("does not configure production delivery in test mode", async () => {
		const fetch = vi.fn();
		const service = createNotificationServiceFromEnvironment({
			NODE_ENV: "test", NOTIFICATIONS_ENABLED: "true", RESEND_API_KEY: "production-key",
			NOTIFICATION_EMAIL_FROM: "orders@bakery.example", BAKER_NOTIFICATION_EMAIL: "baker@example.com",
		}, { fetch });

		expect(service.configuredChannels).toEqual([]);
		expect(fetch).not.toHaveBeenCalled();
	});

	it("skips an unconfigured email channel", () => {
		const service = createNotificationServiceFromEnvironment({ NODE_ENV: "production", NOTIFICATIONS_ENABLED: "true" });
		expect(service.configuredChannels).toEqual([]);
	});

	it("reports partial provider configuration without enabling the channel", () => {
		const logger = { info: vi.fn(), error: vi.fn() };
		const service = createNotificationServiceFromEnvironment({
			NODE_ENV: "production", NOTIFICATIONS_ENABLED: "true", RESEND_API_KEY: "secret",
		}, { logger });

		expect(service.configuredChannels).toEqual([]);
		expect(logger.error).toHaveBeenCalledWith("[notifications] email configuration incomplete", {
			missing: ["NOTIFICATION_EMAIL_FROM", "BAKER_NOTIFICATION_EMAIL"],
		});
	});
});
