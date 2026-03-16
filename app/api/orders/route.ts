import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { OrderRecord } from "@/lib/orderTypes";
import { notifyNewOrder } from "@/lib/notify";

export async function POST(req: NextRequest) {
	try {
		const body = (await req.json()) as Pick<OrderRecord, "customer" | "items" | "totals">;
		const id = `ord_${Date.now().toString(36)}`;
		const supabase = getSupabaseAdmin();

		const { data: slots } = await supabase.from("inventory_slots").select("id");
		const hasInventory = Array.isArray(slots) && slots.length > 0;

		const order: OrderRecord = {
			id,
			createdAt: new Date().toISOString(),
			status: "AWAITING_PAYMENT",
			customer: body.customer,
			items: body.items,
			totals: body.totals,
		};

		if (hasInventory) {
			// Atomic: reserve inventory + insert order in one transaction. Prevents overselling.
			const itemsPayload = body.items.map((i) => ({ id: i.id, qty: i.qty }));
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
