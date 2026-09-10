import { randomUUID } from "node:crypto";
import type { FulfillmentStatus, OrderRecord, PublicOrderTracking } from "./orderTypes";

const TRACKING_TOKEN_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function createTrackingToken(): string {
	return randomUUID();
}

export function isValidTrackingToken(value: string): boolean {
	return TRACKING_TOKEN_PATTERN.test(value);
}

export function toPublicOrderTracking(
	fulfillmentStatus: FulfillmentStatus,
	payload: Pick<OrderRecord, "payment" | "pickup" | "items" | "totals">,
): PublicOrderTracking {
	return {
		fulfillmentStatus,
		payment: { method: payload.payment.method, status: payload.payment.status },
		...(payload.pickup && { pickup: { startAt: payload.pickup.startAt, endAt: payload.pickup.endAt } }),
		items: payload.items.map((item) => ({
			productId: item.productId,
			name: item.name,
			unitPriceCents: item.unitPriceCents,
			quantity: item.quantity,
			lineTotalCents: item.lineTotalCents,
		})),
		totals: payload.totals,
	};
}
