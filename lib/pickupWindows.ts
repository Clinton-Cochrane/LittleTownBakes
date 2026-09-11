export const BAKERY_TIME_ZONE = "America/Los_Angeles";
export type PickupWindow = {
	id: string;
	startAt: string;
	endAt: string;
	enabled: boolean;
};

export type CustomerPickupWindow = Pick<PickupWindow, "id" | "startAt" | "endAt">;

const PICKUP_LEAD_TIME_MS = 15 * 60 * 1000;

type PickupTimes = Pick<PickupWindow, "startAt" | "endAt">;
type LocalParts = { year: number; month: number; day: number; hour: number; minute: number };
type PacificDate = Pick<LocalParts, "year" | "month" | "day">;

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

function pad(value: number): string {
	return String(value).padStart(2, "0");
}

function formatPacificDate(parts: PacificDate): string {
	return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

function parsePacificDate(dateValue: string): PacificDate {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);
	if (!match) throw new Error("Enter a valid date.");
	const expected = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
	const calendarCheck = new Date(Date.UTC(expected.year, expected.month - 1, expected.day));
	if (calendarCheck.getUTCFullYear() !== expected.year
		|| calendarCheck.getUTCMonth() + 1 !== expected.month
		|| calendarCheck.getUTCDate() !== expected.day) {
		throw new Error("Enter a valid date.");
	}
	return expected;
}

/** Returns the bakery-local calendar date containing the supplied instant. */
export function pacificDateFor(date: Date): string {
	return formatPacificDate(localParts(date));
}

/** Advances a calendar label, then resolves it separately so DST day lengths stay correct. */
export function nextPacificCalendarDate(dateValue: string): string {
	const date = parsePacificDate(dateValue);
	const next = new Date(Date.UTC(date.year, date.month - 1, date.day + 1));
	return formatPacificDate({
		year: next.getUTCFullYear(),
		month: next.getUTCMonth() + 1,
		day: next.getUTCDate(),
	});
}

/** Converts owner-entered bakery-local date/time fields to an unambiguous UTC timestamp. */
export function parsePacificDateTime(dateValue: string, timeValue: string): string {
	const date = parsePacificDate(dateValue);
	const timeMatch = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(timeValue);
	if (!timeMatch) throw new Error("Enter a valid time.");

	const expected: LocalParts = {
		...date,
		hour: Number(timeMatch[1]),
		minute: Number(timeMatch[2]),
	};
	const localEpoch = Date.UTC(expected.year, expected.month - 1, expected.day, expected.hour, expected.minute);

	let candidate = new Date(localEpoch);
	for (let iteration = 0; iteration < 3; iteration += 1) {
		candidate = new Date(localEpoch - offsetMilliseconds(candidate));
	}
	if (!sameLocalMinute(localParts(candidate), expected)) {
		throw new Error("Enter a valid Pacific time.");
	}
	return candidate.toISOString();
}

export function validatePickupWindowTimes(
	startAt: string,
	endAt: string,
	now = new Date(),
	allowCurrentStart = false,
): string | null {
	const start = new Date(startAt);
	const end = new Date(endAt);
	if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return "Enter valid pickup times.";
	if (end.getTime() <= start.getTime()) return "End time must be after start time.";
	if (start.getTime() < now.getTime() || (!allowCurrentStart && start.getTime() === now.getTime())) {
		return "Pickup start must be in the future.";
	}
	return null;
}

/** Mirrors the database predicate used by both customer listing and order creation. */
export function isPickupWindowSelectable(
	window: PickupTimes & { enabled: boolean },
	now = new Date(),
): boolean {
	const start = new Date(window.startAt).getTime();
	const end = new Date(window.endAt).getTime();
	const at = now.getTime();
	if (!window.enabled || !Number.isFinite(start) || !Number.isFinite(end) || end <= start) return false;
	return start >= at + PICKUP_LEAD_TIME_MS
		|| (start <= at && end >= at + PICKUP_LEAD_TIME_MS);
}

export function parsePickupWindowInput(body: Record<string, unknown>, now = new Date()) {
	if (typeof body.date !== "string" || typeof body.startTime !== "string" || typeof body.endTime !== "string") {
		return { error: "Date, start time, and end time are required." } as const;
	}
	try {
		const startIsBlank = body.startTime === "";
		const startIsCurrent = startIsBlank && body.date === pacificDateFor(now);
		const startAt = startIsCurrent
			? now.toISOString()
			: parsePacificDateTime(body.date, startIsBlank ? "00:00" : body.startTime);
		const endAt = parsePacificDateTime(
			body.endTime === "" ? nextPacificCalendarDate(body.date) : body.date,
			body.endTime === "" ? "00:00" : body.endTime,
		);
		const error = validatePickupWindowTimes(startAt, endAt, now, startIsCurrent);
		return error ? ({ error } as const) : ({ startAt, endAt } as const);
	} catch (error) {
		return { error: error instanceof Error ? error.message : "Enter valid pickup times." } as const;
	}
}

export function toPacificFormValues(timestamp: string): { date: string; time: string } {
	const parts = localParts(new Date(timestamp));
	return {
		date: formatPacificDate(parts),
		time: `${pad(parts.hour)}:${pad(parts.minute)}`,
	};
}

function isMidnight(parts: ReturnType<typeof localParts>): boolean {
	return parts.hour === 0 && parts.minute === 0 && parts.second === 0;
}

/** Reconstructs safely inferable blank-boundary intent from concrete timestamps. */
export function toPacificWindowFormValues(window: PickupTimes): { date: string; startTime: string; endTime: string } {
	const start = localParts(new Date(window.startAt));
	const end = localParts(new Date(window.endAt));
	const date = formatPacificDate(start);
	const endsAtNextMidnight = isMidnight(end) && formatPacificDate(end) === nextPacificCalendarDate(date);
	return {
		date,
		startTime: isMidnight(start) ? "" : `${pad(start.hour)}:${pad(start.minute)}`,
		endTime: endsAtNextMidnight ? "" : `${pad(end.hour)}:${pad(end.minute)}`,
	};
}

export function formatPickupWindow(window: PickupTimes, _style: "short" | "long" = "long"): string {
	void _style; // Retain the established call signature; both contexts now use the compact natural date.
	const start = new Date(window.startAt);
	const end = new Date(window.endAt);
	const startParts = localParts(start);
	const endParts = localParts(end);
	const startDate = formatPacificDate(startParts);
	const endDate = formatPacificDate(endParts);
	const startsAtMidnight = isMidnight(startParts);
	const endsAtNextMidnight = isMidnight(endParts) && endDate === nextPacificCalendarDate(startDate);
	const date = new Intl.DateTimeFormat("en-US", {
		timeZone: BAKERY_TIME_ZONE,
		weekday: "long",
		month: "short",
		day: "numeric",
	}).format(start);
	const timeFormatter = new Intl.DateTimeFormat("en-US", {
		timeZone: BAKERY_TIME_ZONE,
		hour: "numeric",
		minute: "2-digit",
	});
	if (startsAtMidnight && endsAtNextMidnight) return `${date} · All day`;
	if (endsAtNextMidnight) return `${date} · ${timeFormatter.format(start)}–end of day`;
	if (startsAtMidnight && startDate === endDate) return `${date} · until ${timeFormatter.format(end)}`;
	return `${date} · ${timeFormatter.format(start)}–${timeFormatter.format(end)}`;
}
