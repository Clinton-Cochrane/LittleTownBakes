import type { FulfillmentStatus } from "./orderTypes";

const ALLOWED: Record<FulfillmentStatus, readonly FulfillmentStatus[]> = {
	RECEIVED: ["IN_PROGRESS", "CANCELED"],
	IN_PROGRESS: ["READY_FOR_PICKUP", "CANCELED"],
	READY_FOR_PICKUP: ["COMPLETED", "CANCELED"],
	COMPLETED: [],
	CANCELED: [],
};

export const PIPELINE_STATUSES: FulfillmentStatus[] = ["RECEIVED", "IN_PROGRESS", "READY_FOR_PICKUP", "COMPLETED"];
export function getAllowedNextStatuses(current: FulfillmentStatus): FulfillmentStatus[] { return [...(ALLOWED[current] ?? [])]; }
export function isValidOrderStatusTransition(from: FulfillmentStatus, to: FulfillmentStatus): boolean { return getAllowedNextStatuses(from).includes(to); }
export function orderStatusActionLabel(status: FulfillmentStatus): string {
	return ({ RECEIVED: "Received", IN_PROGRESS: "In progress", READY_FOR_PICKUP: "Ready for pickup", COMPLETED: "Completed", CANCELED: "Canceled" })[status];
}
export function orderStatusAdvanceLabel(to: FulfillmentStatus): string {
	return ({ RECEIVED: "Received", IN_PROGRESS: "Start order", READY_FOR_PICKUP: "Mark ready for pickup", COMPLETED: "Mark picked up / done", CANCELED: "Cancel order" })[to];
}
