/**
 * Server-side validation for flavor-request API payloads.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_ITEM_ID_LEN = 100;
const MAX_EMAIL_LEN = 254;
const MAX_NAME_LEN = 200;
const MAX_NOTES_LEN = 2000;

export type FlavorRequestPayload = {
	item_id: string;
	customer_email: string;
	customer_name: string | null;
	notes: string | null;
};

export function validateFlavorRequestPayload(
	body: unknown
): { ok: true; data: FlavorRequestPayload } | { ok: false; error: string } {
	if (!body || typeof body !== "object") {
		return { ok: false, error: "Invalid request body" };
	}

	const obj = body as Record<string, unknown>;
	const item_id = obj.item_id;
	const customer_email = obj.customer_email;
	const customer_name = obj.customer_name;
	const notes = obj.notes;

	if (typeof item_id !== "string" || item_id.trim().length === 0) {
		return { ok: false, error: "item_id is required" };
	}
	if (item_id.length > MAX_ITEM_ID_LEN) {
		return { ok: false, error: `item_id must be at most ${MAX_ITEM_ID_LEN} characters` };
	}

	if (typeof customer_email !== "string" || !EMAIL_REGEX.test(customer_email.trim())) {
		return { ok: false, error: "customer_email must be a valid email" };
	}
	if (customer_email.length > MAX_EMAIL_LEN) {
		return { ok: false, error: `customer_email must be at most ${MAX_EMAIL_LEN} characters` };
	}

	if (customer_name !== undefined && customer_name !== null) {
		if (typeof customer_name !== "string") {
			return { ok: false, error: "customer_name must be a string" };
		}
		if (customer_name.length > MAX_NAME_LEN) {
			return { ok: false, error: `customer_name must be at most ${MAX_NAME_LEN} characters` };
		}
	}

	if (notes !== undefined && notes !== null) {
		if (typeof notes !== "string") {
			return { ok: false, error: "notes must be a string" };
		}
		if (notes.length > MAX_NOTES_LEN) {
			return { ok: false, error: `notes must be at most ${MAX_NOTES_LEN} characters` };
		}
	}

	return {
		ok: true,
		data: {
			item_id: item_id.trim(),
			customer_email: customer_email.trim(),
			customer_name:
				customer_name !== undefined && customer_name !== null && String(customer_name).trim()
					? String(customer_name).trim()
					: null,
			notes:
				notes !== undefined && notes !== null && String(notes).trim()
					? String(notes).trim()
					: null,
		},
	};
}
