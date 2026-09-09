import { randomUUID } from "node:crypto";
import type { OrderRecord, OrderStatus, PublicOrderTracking } from "./orderTypes";

const TRACKING_TOKEN_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function createTrackingToken(): string {
	return randomUUID();
}

export function isValidTrackingToken(value: string): boolean {
	return TRACKING_TOKEN_PATTERN.test(value);
}

export function toPublicOrderTracking(
	status: OrderStatus,
	payload: Pick<OrderRecord, "items" | "totals">,
): PublicOrderTracking {
	return {
		status,
		items: payload.items.map((item) => ({
			name: item.name,
			price: item.price,
			qty: item.qty,
		})),
		total: payload.totals.total,
	};
}
