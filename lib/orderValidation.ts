/**
 * Server-side validation for order API payloads.
 * Validates structure, types, and constraints before persisting.
 */

import type { OrderRecord } from "./orderTypes";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME_LEN = 200;
const MAX_EMAIL_LEN = 254;
const MAX_PHONE_LEN = 30;
const MAX_NOTES_LEN = 2000;
const MAX_VENMO_USER_LEN = 50;
const MAX_VENMO_NOTE_LEN = 200;
const MAX_ITEMS = 50;
const MAX_ITEM_NAME_LEN = 200;
const MAX_ITEM_ID_LEN = 100;

export function validateOrderPayload(
	body: unknown
): { ok: true; data: Pick<OrderRecord, "customer" | "items" | "totals"> } | { ok: false; error: string } {
	if (!body || typeof body !== "object") {
		return { ok: false, error: "Invalid request body" };
	}

	const obj = body as Record<string, unknown>;
	const customer = obj.customer;
	const items = obj.items;
	const totals = obj.totals;

	if (!customer || typeof customer !== "object") {
		return { ok: false, error: "customer is required" };
	}
	if (!Array.isArray(items)) {
		return { ok: false, error: "items must be an array" };
	}
	if (!totals || typeof totals !== "object") {
		return { ok: false, error: "totals is required" };
	}

	const cust = customer as Record<string, unknown>;
	const name = cust.name;
	const email = cust.email;

	if (typeof name !== "string" || name.trim().length < 2) {
		return { ok: false, error: "customer.name must be at least 2 characters" };
	}
	if (name.length > MAX_NAME_LEN) {
		return { ok: false, error: `customer.name must be at most ${MAX_NAME_LEN} characters` };
	}

	if (typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
		return { ok: false, error: "customer.email must be a valid email" };
	}
	if (email.length > MAX_EMAIL_LEN) {
		return { ok: false, error: `customer.email must be at most ${MAX_EMAIL_LEN} characters` };
	}

	const phone = cust.phone;
	if (phone !== undefined && phone !== null) {
		if (typeof phone !== "string") {
			return { ok: false, error: "customer.phone must be a string" };
		}
		if (phone.length > MAX_PHONE_LEN) {
			return { ok: false, error: `customer.phone must be at most ${MAX_PHONE_LEN} characters` };
		}
	}

	const notes = cust.notes;
	if (notes !== undefined && notes !== null) {
		if (typeof notes !== "string") {
			return { ok: false, error: "customer.notes must be a string" };
		}
		if (notes.length > MAX_NOTES_LEN) {
			return { ok: false, error: `customer.notes must be at most ${MAX_NOTES_LEN} characters` };
		}
	}

	const paymentMethod = cust.paymentMethod;
	const effectivePaymentMethod = paymentMethod === "cash" ? "cash" : "venmo";
	if (paymentMethod !== undefined && paymentMethod !== null && paymentMethod !== "venmo" && paymentMethod !== "cash") {
		return { ok: false, error: "customer.paymentMethod must be 'venmo' or 'cash'" };
	}
	if (effectivePaymentMethod === "venmo") {
		const venmoUser = cust.venmoUser;
		if (typeof venmoUser !== "string" || venmoUser.trim().length === 0) {
			return { ok: false, error: "customer.venmoUser is required when paymentMethod is venmo" };
		}
		if (venmoUser.length > MAX_VENMO_USER_LEN) {
			return { ok: false, error: `customer.venmoUser must be at most ${MAX_VENMO_USER_LEN} characters` };
		}
	}

	const venmoNote = cust.venmoNote;
	if (venmoNote !== undefined && venmoNote !== null) {
		if (typeof venmoNote !== "string") {
			return { ok: false, error: "customer.venmoNote must be a string" };
		}
		if (venmoNote.length > MAX_VENMO_NOTE_LEN) {
			return { ok: false, error: `customer.venmoNote must be at most ${MAX_VENMO_NOTE_LEN} characters` };
		}
	}

	if (items.length === 0) {
		return { ok: false, error: "items cannot be empty" };
	}
	if (items.length > MAX_ITEMS) {
		return { ok: false, error: `items cannot exceed ${MAX_ITEMS}` };
	}

	const validatedItems: { id: string; name: string; price: number; qty: number }[] = [];
	for (let i = 0; i < items.length; i++) {
		const item = items[i];
		if (!item || typeof item !== "object") {
			return { ok: false, error: `items[${i}] must be an object` };
		}
		const it = item as Record<string, unknown>;
		const id = it.id;
		const itemName = it.name;
		const price = it.price;
		const qty = it.qty;

		if (typeof id !== "string" || id.trim().length === 0) {
			return { ok: false, error: `items[${i}].id is required` };
		}
		if (id.length > MAX_ITEM_ID_LEN) {
			return { ok: false, error: `items[${i}].id must be at most ${MAX_ITEM_ID_LEN} characters` };
		}

		if (typeof itemName !== "string" || itemName.trim().length === 0) {
			return { ok: false, error: `items[${i}].name is required` };
		}
		if (itemName.length > MAX_ITEM_NAME_LEN) {
			return { ok: false, error: `items[${i}].name must be at most ${MAX_ITEM_NAME_LEN} characters` };
		}

		if (typeof price !== "number" || !Number.isFinite(price) || price < 0) {
			return { ok: false, error: `items[${i}].price must be a non-negative number` };
		}

		if (typeof qty !== "number" || !Number.isInteger(qty) || qty < 1) {
			return { ok: false, error: `items[${i}].qty must be a positive integer` };
		}

		validatedItems.push({
			id: id.trim(),
			name: itemName.trim(),
			price,
			qty,
		});
	}

	const tot = totals as Record<string, unknown>;
	const subtotal = tot.subtotal;
	const tax = tot.tax;
	const total = tot.total;

	if (typeof subtotal !== "number" || !Number.isFinite(subtotal) || subtotal < 0) {
		return { ok: false, error: "totals.subtotal must be a non-negative number" };
	}
	if (typeof tax !== "number" || !Number.isFinite(tax) || tax < 0) {
		return { ok: false, error: "totals.tax must be a non-negative number" };
	}
	if (typeof total !== "number" || !Number.isFinite(total) || total < 0) {
		return { ok: false, error: "totals.total must be a non-negative number" };
	}

	const customerPayload: OrderRecord["customer"] = {
		name: name.trim(),
		email: email.trim(),
		...(phone !== undefined && phone !== null && { phone: String(phone).trim() }),
		...(notes !== undefined && notes !== null && { notes: String(notes).trim() }),
		paymentMethod: effectivePaymentMethod,
		...(cust.venmoUser !== undefined && cust.venmoUser !== null && {
			venmoUser: String(cust.venmoUser).trim(),
		}),
		...(venmoNote !== undefined && venmoNote !== null && {
			venmoNote: String(venmoNote).trim(),
		}),
	};

	return {
		ok: true,
		data: {
			customer: customerPayload,
			items: validatedItems,
			totals: { subtotal, tax, total },
		},
	};
}
