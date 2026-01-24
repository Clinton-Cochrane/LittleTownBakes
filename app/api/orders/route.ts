import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { OrderRecord } from "@/lib/orderTypes";
import { notifyNewOrder } from "@/lib/notify";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
	const { id } = await context.params;

	if (!process.env.SUPABASE_URL) {
		return NextResponse.json({
			id,
			status: "MOCK",
			customer: { name: "Test Customer" },
			items: [],
			totals: { subtotal: 2500, tax: 200, total: 2700 },
			createdAt: new Date().toISOString(),
		});
	}
	const supabaseAdmin = getSupabaseAdmin();
	const { data, error } = await supabaseAdmin.from("orders").select("payload").eq("id", id).single();

	if (error || !data) return new NextResponse("Not Found", { status: 404 });
	return NextResponse.json(data.payload);
}

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

		const supabaseAdmin = getSupabaseAdmin();
		const { error } = await supabaseAdmin.from("orders").insert({ id: order.id, status: order.status, payload: order });
		if (error) throw error;

		notifyNewOrder(order).catch(console.warn);
		return NextResponse.json({ id: order.id }, { status: 201 });
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} catch (e: any) {
		return NextResponse.json({ error: e.message ?? "failed" }, { status: 400 });
	}
}
