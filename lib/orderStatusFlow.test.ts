import { describe, it, expect } from "vitest";
import {
	getAllowedNextStatuses,
	isValidOrderStatusTransition,
	PIPELINE_STATUSES,
} from "./orderStatusFlow";
import type { OrderStatus } from "./orderTypes";

describe("orderStatusFlow", () => {
	it("does not allow skipping pipeline steps", () => {
		expect(isValidOrderStatusTransition("AWAITING_PAYMENT", "IN_PROGRESS")).toBe(false);
		expect(isValidOrderStatusTransition("PAID", "COMPLETED")).toBe(false);
		expect(isValidOrderStatusTransition("PAID", "READY_FOR_PICKUP")).toBe(false);
	});

	it("allows linear progression", () => {
		expect(isValidOrderStatusTransition("AWAITING_PAYMENT", "PAID")).toBe(true);
		expect(isValidOrderStatusTransition("PAID", "IN_PROGRESS")).toBe(true);
		expect(isValidOrderStatusTransition("IN_PROGRESS", "READY_FOR_PICKUP")).toBe(true);
		expect(isValidOrderStatusTransition("READY_FOR_PICKUP", "COMPLETED")).toBe(true);
	});

	it("allows cancel from non-terminal states", () => {
		const cancellable: OrderStatus[] = [
			"AWAITING_PAYMENT",
			"PAID",
			"IN_PROGRESS",
			"READY_FOR_PICKUP",
		];
		for (const s of cancellable) {
			expect(getAllowedNextStatuses(s)).toContain("CANCELED");
		}
	});

	it("has no transitions from terminal states", () => {
		expect(getAllowedNextStatuses("COMPLETED")).toEqual([]);
		expect(getAllowedNextStatuses("CANCELED")).toEqual([]);
	});

	it("pipeline list matches expected length and order", () => {
		expect(PIPELINE_STATUSES).toEqual([
			"AWAITING_PAYMENT",
			"PAID",
			"IN_PROGRESS",
			"READY_FOR_PICKUP",
			"COMPLETED",
		]);
	});
});
