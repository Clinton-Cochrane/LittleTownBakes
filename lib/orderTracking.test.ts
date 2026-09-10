import { describe, expect, it } from "vitest";
import { createTrackingToken, isValidTrackingToken, toPublicOrderTracking } from "./orderTracking";

describe("public order tracking", () => {
	it("creates distinct cryptographically random UUID tracking tokens", () => {
		const first = createTrackingToken(); const second = createTrackingToken();
		expect(first).not.toBe(second); expect(isValidTrackingToken(first)).toBe(true); expect(isValidTrackingToken(second)).toBe(true);
	});
	it("returns authoritative snapshots without private payment or customer fields", () => {
		const result = toPublicOrderTracking("IN_PROGRESS", {
			payment: { method: "venmo", status: "PAID", venmoUser: "@private", note: "private" },
			pickup: { windowId: "window-1", startAt: "2026-09-19T01:42:00.000Z", endAt: "2026-09-19T02:25:00.000Z" },
			items: [{ productId: "cake", name: "Cake", unitPriceCents: 2500, quantity: 2, lineTotalCents: 5000 }],
			totals: { subtotalCents: 5000, totalCents: 5000 },
		});
		expect(result).toEqual({
			fulfillmentStatus: "IN_PROGRESS", payment: { method: "venmo", status: "PAID" },
			pickup: { startAt: "2026-09-19T01:42:00.000Z", endAt: "2026-09-19T02:25:00.000Z" },
			items: [{ productId: "cake", name: "Cake", unitPriceCents: 2500, quantity: 2, lineTotalCents: 5000 }],
			totals: { subtotalCents: 5000, totalCents: 5000 },
		});
		expect(result.payment).not.toHaveProperty("venmoUser");
		expect(result.pickup).not.toHaveProperty("windowId");
	});
});
