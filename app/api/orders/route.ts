import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { OrderRecord } from "@/lib/orderTypes";
import { notifyNewOrder } from "@/lib/notify";
import { checkRateLimit } from "@/lib/rateLimit";
import { validateOrderPayload } from "@/lib/orderValidation";

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
		const supabase = getSupabaseAdmin();

		const { data: slots } = await supabase.from("inventory_slots").select("id");
		const hasInventory = Array.isArray(slots) && slots.length > 0;

		const order: OrderRecord = {
			id,
			createdAt: new Date().toISOString(),
			status: "AWAITING_PAYMENT",
			customer: orderData.customer,
			items: orderData.items,
			totals: orderData.totals,
		};

		if (hasInventory) {
			// Atomic: reserve inventory + insert order in one transaction. Prevents overselling.
			const itemsPayload = orderData.items.map((i) => ({ id: i.id, qty: i.qty }));
			const { error } = await supabase.rpc("create_order_with_reserve", {
				p_order_id: id,
				p_payload: order,
				p_items: itemsPayload,
			});

			if (error) {
				const msg = error.message ?? "Order failed";
				// PostgreSQL raises "Item X: only N available" on oversell
				return NextResponse.json({ error: msg }, { status: 400 });
			}
		} else {
			// No inventory slots: insert order only (e.g. before admin sets up inventory)
			const { error } = await supabase.from("orders").insert({
				id: order.id,
				status: order.status,
				payload: order,
			});
			if (error) throw error;
		}

		notifyNewOrder(order).catch(console.warn);
		return NextResponse.json({ id: order.id }, { status: 201 });
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} catch (e: any) {
		return NextResponse.json({ error: e.message ?? "failed" }, { status: 400 });
	}
}
