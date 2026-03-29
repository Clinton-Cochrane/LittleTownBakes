import type { OrderRecord } from "./orderTypes";

/** Placeholder until a provider (e.g. Resend, Postmark) is wired; logs only. */
export async function notifyNewOrder(order: OrderRecord) {
	console.log("[notify] new order", order.id);
}

export async function notifyStatusChange(order: OrderRecord) {
	console.log("[notify] status change", order.id, order.status);
}