import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { OrderRecord } from "@/lib/orderTypes";
import { notifyNewOrder } from "@/lib/notify";
import { checkRateLimit } from "@/lib/rateLimit";
import { validateOrderPayload } from "@/lib/orderValidation";
import { createTrackingToken } from "@/lib/orderTracking";
import { createLocalOrder, LocalOrderError } from "@/lib/localData";
import { isLocalMode } from "@/lib/localMode";

const EXPECTED_ERRORS = {
	INVALID_PRODUCT: { status: 400, error: "One or more products are invalid." },
	PRODUCT_UNAVAILABLE: { status: 409, error: "One or more products are no longer available." },
	MAX_QUANTITY_EXCEEDED: { status: 400, error: "A requested quantity exceeds the per-order limit." },
	OUT_OF_STOCK: { status: 409, error: "One or more products do not have enough stock." },
	INVALID_QUANTITY: { status: 400, error: "Quantities must be positive whole numbers." },
	INVALID_PAYMENT_METHOD: { status: 400, error: "Choose a valid payment method." },
	PICKUP_WINDOW_UNAVAILABLE: { status: 409, error: "That pickup time is no longer available. Please choose another pickup time." },
} as const;

function databaseError(message?: string) {
	const code = Object.keys(EXPECTED_ERRORS).find((candidate) => message?.startsWith(candidate)) as keyof typeof EXPECTED_ERRORS | undefined;
	if (!code) return NextResponse.json({ code: "ORDER_FAILED", error: "We could not place your order. Please try again." }, { status: 500 });
	return NextResponse.json({ code, error: EXPECTED_ERRORS[code].error }, { status: EXPECTED_ERRORS[code].status });
}

export async function POST(req: NextRequest) {
	const rateLimitResponse = checkRateLimit(req);
	if (rateLimitResponse) return rateLimitResponse;
	try {
		let body: unknown;
		try { body = await req.json(); } catch { return NextResponse.json({ code: "INVALID_ORDER", error: "Invalid JSON body" }, { status: 400 }); }
		const validation = validateOrderPayload(body);
		if (!validation.ok) return NextResponse.json({ code: validation.code, error: validation.error }, { status: 400 });
		if (isLocalMode()) {
			try {
				const result = await createLocalOrder(validation.data);
				return NextResponse.json(result, { status: 201 });
			} catch (error) {
				if (error instanceof LocalOrderError) return databaseError(error.code);
				throw error;
			}
		}

		const id = `ord_${Date.now().toString(36)}_${crypto.randomUUID().slice(0, 8)}`;
		const trackingToken = createTrackingToken();
		const { data, error } = await getSupabaseAdmin().rpc("create_authoritative_order", {
			p_order_id: id, p_tracking_token: trackingToken,
			p_customer: validation.data.customer, p_payment: validation.data.payment, p_items: validation.data.items,
			p_pickup_window_id: validation.data.pickupWindowId,
		});
		if (error) { console.error("[orders] authoritative order failed", error); return databaseError(error.message); }
		const order = data?.order as OrderRecord | undefined;
		if (!order) { console.error("[orders] authoritative order returned no order", data); return databaseError(); }
		try {
			await notifyNewOrder(order);
		} catch {
			console.error("[orders] notification orchestration failed", { orderId: order.id });
		}
		return NextResponse.json({ trackingToken, order }, { status: 201 });
	} catch (error) {
		console.error("[orders] unexpected failure", error);
		return databaseError();
	}
}
