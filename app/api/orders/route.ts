import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { OrderRecord } from "@/lib/orderTypes";
import { notifyNewOrder } from "@/lib/notify";
import { checkRateLimit } from "@/lib/rateLimit";
import { validateOrderPayload } from "@/lib/orderValidation";
import { createTrackingToken } from "@/lib/orderTracking";

export async function POST(req: NextRequest) {
	const rateLimitResponse = checkRateLimit(req);
	if (rateLimitResponse) return rateLimitResponse;

	try {
		let body: unknown;
		try {
			body = await req.json();
		} catch {
			return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
		}

		const validation = validateOrderPayload(body);
		if (!validation.ok) {
			return NextResponse.json({ error: validation.error }, { status: 400 });
		}

		const { data: orderData } = validation;
		const id = `ord_${Date.now().toString(36)}`;
		const trackingToken = createTrackingToken();
		const supabase = getSupabaseAdmin();

		const order: OrderRecord = {
			id,
			createdAt: new Date().toISOString(),
			status: "AWAITING_PAYMENT",
			customer: orderData.customer,
			items: orderData.items,
			totals: orderData.totals,
		};

		const itemsPayload = orderData.items.map((i) => ({ id: i.id, qty: i.qty }));
		const { error } = await supabase.rpc("create_order_with_reserve", {
			p_order_id: id,
			p_tracking_token: trackingToken,
			p_payload: order,
			p_items: itemsPayload,
		});

		if (error) {
			return NextResponse.json({ error: error.message ?? "Order failed" }, { status: 400 });
		}

		notifyNewOrder(order).catch(console.warn);
		return NextResponse.json({ trackingToken }, { status: 201 });
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} catch (e: any) {
		return NextResponse.json({ error: e.message ?? "failed" }, { status: 400 });
	}
}
