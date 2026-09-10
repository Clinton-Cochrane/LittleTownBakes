import { describe, expect, it } from "vitest";
import { getAllowedNextStatuses, isValidOrderStatusTransition, PIPELINE_STATUSES } from "./orderStatusFlow";

describe("fulfillment status flow", () => {
	it("advances without depending on payment state", () => {
		expect(isValidOrderStatusTransition("RECEIVED", "IN_PROGRESS")).toBe(true);
		expect(isValidOrderStatusTransition("IN_PROGRESS", "READY_FOR_PICKUP")).toBe(true);
		expect(isValidOrderStatusTransition("READY_FOR_PICKUP", "COMPLETED")).toBe(true);
	});
	it("prevents skipped steps and permits cancellation before completion", () => {
		expect(isValidOrderStatusTransition("RECEIVED", "READY_FOR_PICKUP")).toBe(false);
	for (const status of ["RECEIVED", "IN_PROGRESS", "READY_FOR_PICKUP"] as const) expect(getAllowedNextStatuses(status)).toContain("CANCELED");
	});
	it("keeps terminal states terminal", () => {
		expect(getAllowedNextStatuses("COMPLETED")).toEqual([]);
		expect(getAllowedNextStatuses("CANCELED")).toEqual([]);
	});
	it("contains fulfillment states only", () => {
		expect(PIPELINE_STATUSES).toEqual(["RECEIVED", "IN_PROGRESS", "READY_FOR_PICKUP", "COMPLETED"]);
	});
});
