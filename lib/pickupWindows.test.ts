import { describe, expect, it } from "vitest";
import {
	formatPickupWindow,
	parsePacificDateTime,
} from "./pickupWindows";

describe("pickup windows", () => {
	it("accepts minute-precise Pacific local times and formats them in Pacific Time", () => {
		const startAt = parsePacificDateTime("2026-09-18", "18:42");
		const endAt = parsePacificDateTime("2026-09-18", "19:25");

		expect(startAt).toBe("2026-09-19T01:42:00.000Z");
		expect(endAt).toBe("2026-09-19T02:25:00.000Z");
		expect(formatPickupWindow({ startAt, endAt }, "short")).toBe(
			"Friday, Sep 18 · 6:42 PM–7:25 PM",
		);
	});

	it("uses PST/PDT from America/Los_Angeles instead of a fixed UTC offset", () => {
		expect(parsePacificDateTime("2026-01-15", "18:42")).toBe("2026-01-16T02:42:00.000Z");
		expect(parsePacificDateTime("2026-07-15", "18:42")).toBe("2026-07-16T01:42:00.000Z");
	});

	it("rejects malformed, impossible, and DST-skipped local times", () => {
		expect(() => parsePacificDateTime("2026-02-30", "18:42")).toThrow("valid date");
		expect(() => parsePacificDateTime("2026-03-08", "02:30")).toThrow("valid Pacific time");
		expect(() => parsePacificDateTime("2026-09-18", "18:60")).toThrow("valid time");
	});

});
