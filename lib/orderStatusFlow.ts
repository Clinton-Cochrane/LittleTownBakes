import type { OrderStatus } from "./orderTypes";

/**
 * Allowed one-step transitions for the bakery order workflow.
 * Terminal states (COMPLETED, CANCELED) cannot be changed through this flow.
 */
const ALLOWED: Record<OrderStatus, readonly OrderStatus[]> = {
	AWAITING_PAYMENT: ["PAID", "CANCELED"],
	PAID: ["IN_PROGRESS", "CANCELED"],
	IN_PROGRESS: ["READY_FOR_PICKUP", "CANCELED"],
	READY_FOR_PICKUP: ["COMPLETED", "CANCELED"],
	COMPLETED: [],
	CANCELED: [],
};

/** Main line statuses shown in the admin pipeline (excludes CANCELED). */
export const PIPELINE_STATUSES: OrderStatus[] = [
	"AWAITING_PAYMENT",
	"PAID",
	"IN_PROGRESS",
	"READY_FOR_PICKUP",
	"COMPLETED",
];

export function getAllowedNextStatuses(current: OrderStatus): OrderStatus[] {
	return [...(ALLOWED[current] ?? [])];
}

export function isValidOrderStatusTransition(from: OrderStatus, to: OrderStatus): boolean {
	return getAllowedNextStatuses(from).includes(to);
}

/** Short label for buttons and chips. */
export function orderStatusActionLabel(status: OrderStatus): string {
	switch (status) {
		case "AWAITING_PAYMENT":
			return "Awaiting payment";
		case "PAID":
			return "Paid";
		case "IN_PROGRESS":
			return "In progress";
		case "READY_FOR_PICKUP":
			return "Ready for pickup";
		case "COMPLETED":
			return "Completed";
		case "CANCELED":
			return "Canceled";
	}
}

/** Primary CTA label for moving into `to` from the current step (when valid). */
export function orderStatusAdvanceLabel(to: OrderStatus): string {
	switch (to) {
		case "PAID":
			return "Mark payment received";
		case "IN_PROGRESS":
			return "Start order";
		case "READY_FOR_PICKUP":
			return "Mark ready for pickup";
		case "COMPLETED":
			return "Mark picked up / done";
		case "CANCELED":
			return "Cancel order";
		default:
			return orderStatusActionLabel(to);
	}
}
