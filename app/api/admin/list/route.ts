import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { AdminOrderRecord, OrderRecord } from "@/lib/orderTypes";
import { listLocalOrders } from "@/lib/localData";
import { isLocalMode } from "@/lib/localMode";

type OrderRow = {
	id: unknown;
	public_order_number: unknown;
	tracking_token: unknown;
	created_at: unknown;
	status: unknown;
	payload: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOptionalString(value: unknown): value is string | undefined {
	return value === undefined || typeof value === "string";
}

function isMoney(value: unknown): value is number {
	return Number.isSafeInteger(value) && (value as number) >= 0;
}

function normalizeOrderRow(row: OrderRow): { order: AdminOrderRecord } | { reason: string } {
	if (typeof row.id !== "string") return { reason: "invalid id" };
	if (!Number.isSafeInteger(row.public_order_number) || (row.public_order_number as number) <= 0) return { reason: "invalid public order number" };
	if (row.tracking_token !== null && typeof row.tracking_token !== "string") return { reason: "invalid tracking token" };
	if (!isRecord(row.payload)) return { reason: "invalid payload" };

	const payload = row.payload;
	const createdAt = row.created_at ?? payload.createdAt;
	if (typeof createdAt !== "string") return { reason: "missing createdAt" };
	if (row.status !== "RECEIVED" && row.status !== "IN_PROGRESS" && row.status !== "READY_FOR_PICKUP" && row.status !== "COMPLETED" && row.status !== "CANCELED") {
		return { reason: "invalid fulfillment status" };
	}

	if (!isRecord(payload.payment)) return { reason: "missing payment" };
	const payment = payload.payment;
	if (payment.method !== "cash" && payment.method !== "venmo" && payment.method !== "zelle") return { reason: "invalid payment method" };
	if (payment.status !== "PENDING" && payment.status !== "PAID") return { reason: "invalid payment status" };
	if (!isOptionalString(payment.venmoUser) || !isOptionalString(payment.note)) return { reason: "invalid payment details" };

	if (!isRecord(payload.customer)) return { reason: "missing customer" };
	const customer = payload.customer;
	if (typeof customer.name !== "string" || typeof customer.email !== "string" || !isOptionalString(customer.phone) || !isOptionalString(customer.notes)) {
		return { reason: "invalid customer" };
	}

	let pickup: OrderRecord["pickup"];
	if (payload.pickup !== undefined) {
		if (!isRecord(payload.pickup)) return { reason: "invalid pickup" };
		if (typeof payload.pickup.windowId !== "string" || typeof payload.pickup.startAt !== "string" || typeof payload.pickup.endAt !== "string") {
			return { reason: "invalid pickup" };
		}
		pickup = {
			windowId: payload.pickup.windowId,
			startAt: payload.pickup.startAt,
			endAt: payload.pickup.endAt,
		};
	}

	if (!Array.isArray(payload.items)) return { reason: "missing items" };
	const items: OrderRecord["items"] = [];
	for (const item of payload.items) {
		if (!isRecord(item) || typeof item.productId !== "string" || typeof item.name !== "string"
			|| !isMoney(item.unitPriceCents) || !Number.isSafeInteger(item.quantity) || (item.quantity as number) <= 0
			|| !isMoney(item.lineTotalCents)) {
			return { reason: "invalid items" };
		}
		items.push({
			productId: item.productId,
			name: item.name,
			unitPriceCents: item.unitPriceCents,
			quantity: item.quantity as number,
			lineTotalCents: item.lineTotalCents,
		});
	}

	if (!isRecord(payload.totals) || !isMoney(payload.totals.subtotalCents) || !isMoney(payload.totals.totalCents)) {
		return { reason: "missing or invalid totals" };
	}

	return { order: {
		id: row.id,
		publicOrderNumber: row.public_order_number as number,
		trackingToken: row.tracking_token,
		createdAt,
		fulfillmentStatus: row.status,
		payment: {
			method: payment.method,
			status: payment.status,
			...(payment.venmoUser !== undefined && { venmoUser: payment.venmoUser }),
			...(payment.note !== undefined && { note: payment.note }),
		},
		customer: {
			name: customer.name,
			email: customer.email,
			...(customer.phone !== undefined && { phone: customer.phone }),
			...(customer.notes !== undefined && { notes: customer.notes }),
		},
		...(pickup !== undefined && { pickup }),
		items,
		totals: { subtotalCents: payload.totals.subtotalCents, totalCents: payload.totals.totalCents },
	} };
}

/**
 * Admin list orders API.
 * Returns orders with id, status, createdAt from DB columns (source of truth)
 * merged with payload (customer, items, totals).
 */
export async function GET(req: NextRequest) {
	const authorization = await requireAdmin();
	if (!authorization.authorized) return authorization.response;
	const statusFilter = req.nextUrl.searchParams.get("status") ?? undefined;
	if (isLocalMode()) return NextResponse.json(await listLocalOrders(statusFilter));

	const supabase = getSupabaseAdmin();

	let query = supabase
		.from("orders")
		.select("id, public_order_number, tracking_token, created_at, status, payload")
		.order("created_at", { ascending: false });

	if (statusFilter) {
		query = query.eq("status", statusFilter);
	}

	const { data, error } = await query;

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 400 });
	}

	const orders: AdminOrderRecord[] = [];
	for (const row of data ?? []) {
		const result = normalizeOrderRow(row);
		if ("order" in result) {
			orders.push(result.order);
		} else {
			console.error("[admin/orders] omitted malformed order", { orderId: row.id, reason: result.reason });
		}
	}

	return NextResponse.json(orders);
}
