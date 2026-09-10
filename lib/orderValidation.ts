import type { PaymentMethod } from "./orderTypes";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_ITEMS = 50;
const LIMITS = { name: 200, email: 254, phone: 30, notes: 2000, productId: 100, venmoUser: 50, paymentNote: 200 };

type TrustedOrderRequest = {
	customer: { name: string; email: string; phone?: string; notes?: string };
	payment: { method: PaymentMethod; venmoUser?: string; note?: string };
	pickupWindowId: string;
	items: { productId: string; quantity: number }[];
};

type ValidationError = { ok: false; code: "INVALID_ORDER" | "INVALID_QUANTITY" | "INVALID_PAYMENT_METHOD" | "INVALID_PICKUP_WINDOW"; error: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function optionalString(value: unknown, field: string, max: number): string | ValidationError | undefined {
	if (value === undefined || value === null || value === "") return undefined;
	if (typeof value !== "string" || value.length > max) return { ok: false, code: "INVALID_ORDER", error: `${field} must be at most ${max} characters` };
	return value.trim() || undefined;
}

export function validateOrderPayload(body: unknown): { ok: true; data: TrustedOrderRequest } | ValidationError {
	if (!body || typeof body !== "object") return { ok: false, code: "INVALID_ORDER", error: "Invalid request body" };
	const input = body as Record<string, unknown>;
	if (!input.customer || typeof input.customer !== "object") return { ok: false, code: "INVALID_ORDER", error: "Customer information is required" };
	if (!input.payment || typeof input.payment !== "object") return { ok: false, code: "INVALID_PAYMENT_METHOD", error: "Payment method is required" };
	if (typeof input.pickupWindowId !== "string" || !UUID_PATTERN.test(input.pickupWindowId)) {
		return { ok: false, code: "INVALID_PICKUP_WINDOW", error: "Choose an available pickup time." };
	}
	if (!Array.isArray(input.items) || input.items.length === 0 || input.items.length > MAX_ITEMS) return { ok: false, code: "INVALID_ORDER", error: `Order must contain between 1 and ${MAX_ITEMS} items` };

	const customerInput = input.customer as Record<string, unknown>;
	const name = typeof customerInput.name === "string" ? customerInput.name.trim() : "";
	const email = typeof customerInput.email === "string" ? customerInput.email.trim() : "";
	if (name.length < 2 || name.length > LIMITS.name) return { ok: false, code: "INVALID_ORDER", error: "Enter a valid customer name" };
	if (!EMAIL_REGEX.test(email) || email.length > LIMITS.email) return { ok: false, code: "INVALID_ORDER", error: "Enter a valid email address" };
	const phone = optionalString(customerInput.phone, "customer.phone", LIMITS.phone);
	if (phone && typeof phone !== "string") return phone;
	const notes = optionalString(customerInput.notes, "customer.notes", LIMITS.notes);
	if (notes && typeof notes !== "string") return notes;

	const paymentInput = input.payment as Record<string, unknown>;
	const method = paymentInput.method;
	if (method !== "cash" && method !== "venmo" && method !== "zelle") return { ok: false, code: "INVALID_PAYMENT_METHOD", error: "Choose Cash, Venmo, or Zelle" };
	const venmoUser = optionalString(paymentInput.venmoUser, "payment.venmoUser", LIMITS.venmoUser);
	if (venmoUser && typeof venmoUser !== "string") return venmoUser;
	if (method === "venmo" && !venmoUser) return { ok: false, code: "INVALID_PAYMENT_METHOD", error: "Venmo username is required" };
	const note = optionalString(paymentInput.note, "payment.note", LIMITS.paymentNote);
	if (note && typeof note !== "string") return note;

	const quantities = new Map<string, number>();
	for (let index = 0; index < input.items.length; index += 1) {
		const item = input.items[index];
		if (!item || typeof item !== "object") return { ok: false, code: "INVALID_ORDER", error: `Item ${index + 1} is invalid` };
		const value = item as Record<string, unknown>;
		const productId = typeof value.productId === "string" ? value.productId.trim() : "";
		if (!productId || productId.length > LIMITS.productId) return { ok: false, code: "INVALID_ORDER", error: `Item ${index + 1} has an invalid product ID` };
		if (!Number.isSafeInteger(value.quantity) || (value.quantity as number) <= 0) return { ok: false, code: "INVALID_QUANTITY", error: "Quantities must be positive whole numbers" };
		const combined = (quantities.get(productId) ?? 0) + (value.quantity as number);
		if (!Number.isSafeInteger(combined)) return { ok: false, code: "INVALID_QUANTITY", error: "Quantity is too large" };
		quantities.set(productId, combined);
	}

	return { ok: true, data: {
		customer: { name, email, ...(phone && { phone }), ...(notes && { notes }) },
		payment: { method, ...(method === "venmo" && venmoUser && { venmoUser }), ...(note && { note }) },
		pickupWindowId: input.pickupWindowId,
		items: [...quantities].map(([productId, quantity]) => ({ productId, quantity })),
	} };
}
