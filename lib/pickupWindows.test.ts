import { describe, expect, it } from "vitest";
import {
	formatPickupWindow,
	isPickupWindowSelectable,
	parsePacificDateTime,
	parsePickupWindowInput,
	toPacificWindowFormValues,
} from "./pickupWindows";

const NOW = new Date("2026-09-11T21:15:00.000Z"); // Sep 11, 2:15 PM Pacific

function parse(date: string, startTime: string, endTime: string, now = NOW) {
	const result = parsePickupWindowInput({ date, startTime, endTime }, now);
	if ("error" in result) throw new Error(result.error);
	return result;
}

describe("pickup window parsing", () => {
	it("resolves every future blank-boundary combination in Pacific local time", () => {
		expect(parse("2026-09-20", "", "")).toEqual({
			startAt: "2026-09-20T07:00:00.000Z", endAt: "2026-09-21T07:00:00.000Z",
		});
		expect(parse("2026-09-20", "14:00", "")).toEqual({
			startAt: "2026-09-20T21:00:00.000Z", endAt: "2026-09-21T07:00:00.000Z",
		});
		expect(parse("2026-09-20", "", "18:00")).toEqual({
			startAt: "2026-09-20T07:00:00.000Z", endAt: "2026-09-21T01:00:00.000Z",
		});
		expect(parse("2026-09-20", "14:00", "18:00")).toEqual({
			startAt: "2026-09-20T21:00:00.000Z", endAt: "2026-09-21T01:00:00.000Z",
		});
	});

	it("uses now for a blank start today and keeps explicit past starts invalid", () => {
		expect(parse("2026-09-11", "", "")).toEqual({
			startAt: NOW.toISOString(), endAt: "2026-09-12T07:00:00.000Z",
		});
		expect(parse("2026-09-11", "", "18:00")).toEqual({
			startAt: NOW.toISOString(), endAt: "2026-09-12T01:00:00.000Z",
		});
		expect(parsePickupWindowInput({ date: "2026-09-11", startTime: "14:00", endTime: "18:00" }, NOW))
			.toEqual({ error: "Pickup start must be in the future." });
	});

	it("rejects elapsed, equal, reversed, and malformed boundaries", () => {
		expect(parsePickupWindowInput({ date: "2026-09-11", startTime: "", endTime: "14:00" }, NOW))
			.toEqual({ error: "End time must be after start time." });
		expect(parsePickupWindowInput({ date: "2026-09-11", startTime: "", endTime: "14:15" }, NOW))
			.toEqual({ error: "End time must be after start time." });
		expect(parsePickupWindowInput({ date: "2026-09-20", startTime: "18:00", endTime: "14:00" }, NOW))
			.toEqual({ error: "End time must be after start time." });
		expect(parsePickupWindowInput({ date: "2026-02-30", startTime: "", endTime: "" }, NOW))
			.toEqual({ error: "Enter a valid date." });
		expect(parsePickupWindowInput({ date: "2026-09-20", startTime: "noon", endTime: "" }, NOW))
			.toEqual({ error: "Enter a valid time." });
	});

	it("keeps concrete conversion strict and rejects skipped spring-forward times", () => {
		expect(parsePacificDateTime("2026-01-15", "18:42")).toBe("2026-01-16T02:42:00.000Z");
		expect(parsePacificDateTime("2026-07-15", "18:42")).toBe("2026-07-16T01:42:00.000Z");
		expect(() => parsePacificDateTime("2026-03-08", "02:30")).toThrow("valid Pacific time");
		expect(() => parsePacificDateTime("2026-09-18", "18:60")).toThrow("valid time");
	});

	it("resolves next local midnight across 23-hour and 25-hour DST days", () => {
		const spring = parse("2026-03-08", "", "", new Date("2026-03-01T20:00:00.000Z"));
		expect(spring).toEqual({
			startAt: "2026-03-08T08:00:00.000Z", endAt: "2026-03-09T07:00:00.000Z",
		});
		expect(new Date(spring.endAt).getTime() - new Date(spring.startAt).getTime()).toBe(23 * 60 * 60 * 1000);

		const fall = parse("2026-11-01", "", "", new Date("2026-10-01T19:00:00.000Z"));
		expect(fall).toEqual({
			startAt: "2026-11-01T07:00:00.000Z", endAt: "2026-11-02T08:00:00.000Z",
		});
		expect(new Date(fall.endAt).getTime() - new Date(fall.startAt).getTime()).toBe(25 * 60 * 60 * 1000);
	});
});

describe("pickup window formatting and edit reconstruction", () => {
	it.each([
		["all day", { startAt: "2026-09-20T07:00:00.000Z", endAt: "2026-09-21T07:00:00.000Z" }, "Sunday, Sep 20 · All day"],
		["start through end of day", { startAt: "2026-09-20T21:00:00.000Z", endAt: "2026-09-21T07:00:00.000Z" }, "Sunday, Sep 20 · 2:00 PM–end of day"],
		["beginning through explicit end", { startAt: "2026-09-20T07:00:00.000Z", endAt: "2026-09-21T01:00:00.000Z" }, "Sunday, Sep 20 · until 6:00 PM"],
		["explicit window", { startAt: "2026-09-20T21:00:00.000Z", endAt: "2026-09-21T01:00:00.000Z" }, "Sunday, Sep 20 · 2:00 PM–6:00 PM"],
		["today remainder", { startAt: NOW.toISOString(), endAt: "2026-09-12T07:00:00.000Z" }, "Friday, Sep 11 · 2:15 PM–end of day"],
	])("formats %s naturally", (_name, window, expected) => {
		expect(formatPickupWindow(window)).toBe(expected);
	});

	it.each([
		[{ startAt: "2026-09-20T07:00:00.000Z", endAt: "2026-09-21T07:00:00.000Z" }, { date: "2026-09-20", startTime: "", endTime: "" }],
		[{ startAt: "2026-09-20T21:00:00.000Z", endAt: "2026-09-21T07:00:00.000Z" }, { date: "2026-09-20", startTime: "14:00", endTime: "" }],
		[{ startAt: "2026-09-20T07:00:00.000Z", endAt: "2026-09-21T01:00:00.000Z" }, { date: "2026-09-20", startTime: "", endTime: "18:00" }],
	])("round-trips safely inferred blank intent", (window, form) => {
		expect(toPacificWindowFormValues(window)).toEqual(form);
		expect(parse(form.date, form.startTime, form.endTime)).toEqual(window);
	});

	it("keeps a concrete remainder-of-day start concrete when intent cannot be inferred", () => {
		expect(toPacificWindowFormValues({ startAt: NOW.toISOString(), endAt: "2026-09-12T07:00:00.000Z" }))
			.toEqual({ date: "2026-09-11", startTime: "14:15", endTime: "" });
	});
});

describe("pickup window selectability", () => {
	it("preserves the future-start lead time and permits open windows with meaningful time remaining", () => {
		expect(isPickupWindowSelectable({ startAt: "2026-09-11T21:30:00.000Z", endAt: "2026-09-11T23:00:00.000Z", enabled: true }, NOW)).toBe(true);
		expect(isPickupWindowSelectable({ startAt: NOW.toISOString(), endAt: "2026-09-11T23:00:00.000Z", enabled: true }, NOW)).toBe(true);
		expect(isPickupWindowSelectable({ startAt: "2026-09-11T21:00:00.000Z", endAt: "2026-09-11T21:29:59.999Z", enabled: true }, NOW)).toBe(false);
		expect(isPickupWindowSelectable({ startAt: "2026-09-11T21:00:00.000Z", endAt: "2026-09-11T23:00:00.000Z", enabled: false }, NOW)).toBe(false);
	});
});
