export const BAKERY_TIME_ZONE = "America/Los_Angeles";
export type PickupWindow = {
	id: string;
	startAt: string;
	endAt: string;
	enabled: boolean;
};

export type CustomerPickupWindow = Pick<PickupWindow, "id" | "startAt" | "endAt">;

type PickupTimes = Pick<PickupWindow, "startAt" | "endAt">;
type LocalParts = { year: number; month: number; day: number; hour: number; minute: number };

const pacificPartsFormatter = new Intl.DateTimeFormat("en-US", {
	timeZone: BAKERY_TIME_ZONE,
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
	hour: "2-digit",
	minute: "2-digit",
	second: "2-digit",
	hourCycle: "h23",
});

function localParts(date: Date): LocalParts & { second: number } {
	const parts = Object.fromEntries(
		pacificPartsFormatter.formatToParts(date)
			.filter((part) => part.type !== "literal")
			.map((part) => [part.type, Number(part.value)]),
	);
	return {
		year: parts.year,
		month: parts.month,
		day: parts.day,
		hour: parts.hour,
		minute: parts.minute,
		second: parts.second,
	};
}

function sameLocalMinute(actual: ReturnType<typeof localParts>, expected: LocalParts): boolean {
	return actual.year === expected.year
		&& actual.month === expected.month
		&& actual.day === expected.day
		&& actual.hour === expected.hour
		&& actual.minute === expected.minute;
}

function offsetMilliseconds(date: Date): number {
	const parts = localParts(date);
	return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
		- date.getTime();
}

/** Converts owner-entered bakery-local date/time fields to an unambiguous UTC timestamp. */
export function parsePacificDateTime(dateValue: string, timeValue: string): string {
	const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);
	if (!dateMatch) throw new Error("Enter a valid date.");
	const timeMatch = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(timeValue);
	if (!timeMatch) throw new Error("Enter a valid time.");

	const expected: LocalParts = {
		year: Number(dateMatch[1]),
		month: Number(dateMatch[2]),
		day: Number(dateMatch[3]),
		hour: Number(timeMatch[1]),
		minute: Number(timeMatch[2]),
	};
	const localEpoch = Date.UTC(expected.year, expected.month - 1, expected.day, expected.hour, expected.minute);
	const calendarCheck = new Date(Date.UTC(expected.year, expected.month - 1, expected.day));
	if (calendarCheck.getUTCFullYear() !== expected.year
		|| calendarCheck.getUTCMonth() + 1 !== expected.month
		|| calendarCheck.getUTCDate() !== expected.day) {
		throw new Error("Enter a valid date.");
	}

	let candidate = new Date(localEpoch);
	for (let iteration = 0; iteration < 3; iteration += 1) {
		candidate = new Date(localEpoch - offsetMilliseconds(candidate));
	}
	if (!sameLocalMinute(localParts(candidate), expected)) {
		throw new Error("Enter a valid Pacific time.");
	}
	return candidate.toISOString();
}

export function validatePickupWindowTimes(startAt: string, endAt: string, now = new Date()): string | null {
	const start = new Date(startAt);
	const end = new Date(endAt);
	if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return "Enter valid pickup times.";
	if (end.getTime() <= start.getTime()) return "End time must be after start time.";
	if (start.getTime() <= now.getTime()) return "Pickup start must be in the future.";
	return null;
}

export function parsePickupWindowInput(body: Record<string, unknown>, now = new Date()) {
	if (typeof body.date !== "string" || typeof body.startTime !== "string" || typeof body.endTime !== "string") {
		return { error: "Date, start time, and end time are required." } as const;
	}
	try {
		const startAt = parsePacificDateTime(body.date, body.startTime);
		const endAt = parsePacificDateTime(body.date, body.endTime);
		const error = validatePickupWindowTimes(startAt, endAt, now);
		return error ? ({ error } as const) : ({ startAt, endAt } as const);
	} catch (error) {
		return { error: error instanceof Error ? error.message : "Enter valid pickup times." } as const;
	}
}

export function toPacificFormValues(timestamp: string): { date: string; time: string } {
	const parts = localParts(new Date(timestamp));
	const pad = (value: number) => String(value).padStart(2, "0");
	return {
		date: `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`,
		time: `${pad(parts.hour)}:${pad(parts.minute)}`,
	};
}

export function formatPickupWindow(window: PickupTimes, style: "short" | "long" = "long"): string {
	const start = new Date(window.startAt);
	const end = new Date(window.endAt);
	const date = new Intl.DateTimeFormat("en-US", {
		timeZone: BAKERY_TIME_ZONE,
		weekday: "long",
		month: style === "short" ? "short" : "long",
		day: "numeric",
	}).format(start);
	const timeFormatter = new Intl.DateTimeFormat("en-US", {
		timeZone: BAKERY_TIME_ZONE,
		hour: "numeric",
		minute: "2-digit",
	});
	return `${date} · ${timeFormatter.format(start)}–${timeFormatter.format(end)}`;
}
