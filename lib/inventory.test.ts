import { describe, it, expect } from "vitest";
import {
	getWeekStart,
	getMonthStart,
	getRemaining,
	findRelevantSlot,
	validateOrderAgainstSlots,
	type InventorySlot,
} from "./inventory";

describe("getWeekStart", () => {
	it("returns YYYY-MM-DD format", () => {
		const result = getWeekStart(new Date("2025-03-13T12:00:00"));
		expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});

	it("returns same value for dates in same week", () => {
		const thursday = getWeekStart(new Date("2025-03-13T12:00:00"));
		const friday = getWeekStart(new Date("2025-03-14T12:00:00"));
		expect(thursday).toBe(friday);
	});

	it("returns different value for adjacent weeks", () => {
		const week1 = getWeekStart(new Date("2025-03-13T12:00:00"));
		const week2 = getWeekStart(new Date("2025-03-20T12:00:00"));
		expect(week1).not.toBe(week2);
	});
});

describe("getMonthStart", () => {
	it("returns first of month", () => {
		expect(getMonthStart(new Date("2025-03-15T12:00:00"))).toBe("2025-03-01");
	});

	it("returns YYYY-MM-DD format", () => {
		const result = getMonthStart(new Date("2025-03-13T12:00:00"));
		expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});
});

describe("getRemaining", () => {
	it("returns available minus sold", () => {
		const slot: InventorySlot = {
			id: "1",
			item_id: "cake",
			period_type: "week",
			period_start: "2025-03-10",
			quantity_available: 10,
			quantity_sold: 3,
		};
		expect(getRemaining(slot)).toBe(7);
	});

	it("returns 0 when sold exceeds available", () => {
		const slot: InventorySlot = {
			id: "1",
			item_id: "cake",
			period_type: "week",
			period_start: "2025-03-10",
			quantity_available: 5,
			quantity_sold: 10,
		};
		expect(getRemaining(slot)).toBe(0);
	});
});

describe("findRelevantSlot", () => {
	it("prefers week slot over month when both match", () => {
		const now = new Date("2025-03-13T12:00:00");
		const weekStart = getWeekStart(now);
		const monthStart = getMonthStart(now);
		const slots: InventorySlot[] = [
			{ id: "1", item_id: "cake", period_type: "month", period_start: monthStart, quantity_available: 100, quantity_sold: 0 },
			{ id: "2", item_id: "cake", period_type: "week", period_start: weekStart, quantity_available: 10, quantity_sold: 0 },
		];
		const found = findRelevantSlot(slots, "cake", now);
		expect(found?.period_type).toBe("week");
	});

	it("returns month slot when no week slot", () => {
		const now = new Date("2025-03-13T12:00:00");
		const monthStart = getMonthStart(now);
		const slots: InventorySlot[] = [
			{ id: "1", item_id: "cake", period_type: "month", period_start: monthStart, quantity_available: 100, quantity_sold: 0 },
		];
		const found = findRelevantSlot(slots, "cake", now);
		expect(found?.period_type).toBe("month");
	});

	it("returns null when no matching slot", () => {
		const now = new Date("2025-03-13T12:00:00");
		const weekStart = getWeekStart(now);
		const slots: InventorySlot[] = [
			{ id: "1", item_id: "other", period_type: "week", period_start: weekStart, quantity_available: 10, quantity_sold: 0 },
		];
		expect(findRelevantSlot(slots, "cake", now)).toBeNull();
	});
});

describe("validateOrderAgainstSlots", () => {
	const now = new Date("2025-03-13T12:00:00");
	const weekStart = getWeekStart(now);
	const slots: InventorySlot[] = [
		{
			id: "1",
			item_id: "cake",
			period_type: "week",
			period_start: weekStart,
			quantity_available: 5,
			quantity_sold: 2,
		},
	];

	it("returns null when order is valid", () => {
		expect(validateOrderAgainstSlots(slots, [{ id: "cake", qty: 3 }], now)).toBeNull();
	});

	it("returns error when qty exceeds remaining", () => {
		const err = validateOrderAgainstSlots(slots, [{ id: "cake", qty: 5 }], now);
		expect(err).toBeTruthy();
		expect(err).toContain("cake");
		expect(err).toContain("3");
	});

	it("returns null for items without slot (unlimited)", () => {
		expect(validateOrderAgainstSlots(slots, [{ id: "unlimited_item", qty: 100 }], now)).toBeNull();
	});
});
