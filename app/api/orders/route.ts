import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { OrderRecord } from "@/lib/orderTypes";
import { notifyNewOrder } from "@/lib/notify";

export async function POST(req: NextRequest) {
	try {
		const body = (await req.json()) as Pick<OrderRecord, "customer" | "items" | "totals">;
		const id = `ord_${Date.now().toString(36)}`;

		const order: OrderRecord = {
			id,
			createdAt: new Date().toISOString(),
			status: "AWAITING_PAYMENT",
			customer: body.customer,
			items: body.items,
			totals: body.totals,
		};

		const { error } = await supabaseAdmin.from("orders").insert({ id: order.id, status: order.status, payload: order });
		if (error) throw error;

		notifyNewOrder(order).catch(console.warn);
		return NextResponse.json({ id: order.id }, { status: 201 });
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} catch (e: any) {
		return NextResponse.json({ error: e.message ?? "failed" }, { status: 400 });
	}
}
