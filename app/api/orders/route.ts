import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { OrderRecord } from "@/lib/orderTypes";
import { notifyNewOrder } from "@/lib/notify";
import {
	findRelevantSlot,
	validateOrderAgainstSlots,
	type InventorySlot,
} from "@/lib/inventory";

<<<<<<< HEAD
async function reserveInventory(items: { id: string; qty: number }[]): Promise<void> {
	const now = new Date();
	const { data: slots } = await supabaseAdmin.from("inventory_slots").select("*");
	const inventorySlots = (slots ?? []) as InventorySlot[];

	for (const item of items) {
		const slot = findRelevantSlot(inventorySlots, item.id, now);
		if (!slot) continue;

		const { data: current } = await supabaseAdmin
			.from("inventory_slots")
			.select("quantity_sold")
			.eq("id", slot.id)
			.single();

		if (current) {
			const newSold = (current.quantity_sold ?? 0) + item.qty;
			await supabaseAdmin
				.from("inventory_slots")
				.update({ quantity_sold: newSold })
				.eq("id", slot.id);
		}
	}
=======
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
>>>>>>> a004a02a44dfab223c819b0df54706f05fc1824c
}

export async function POST(req: NextRequest) {
	try {
		const body = (await req.json()) as Pick<OrderRecord, "customer" | "items" | "totals">;
		const id = `ord_${Date.now().toString(36)}`;

		// Validate inventory if slots exist (table may not exist yet)
		const { data: slots } = await supabaseAdmin.from("inventory_slots").select("*");
		const inventorySlots = (slots ?? []) as InventorySlot[];
		if (inventorySlots.length > 0) {
			const err = validateOrderAgainstSlots(
				inventorySlots,
				body.items.map((i) => ({ id: i.id, qty: i.qty })),
				new Date()
			);
			if (err) return NextResponse.json({ error: err }, { status: 400 });
		}

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

		if (inventorySlots.length > 0) {
			await reserveInventory(body.items.map((i) => ({ id: i.id, qty: i.qty })));
		}

		notifyNewOrder(order).catch(console.warn);
		return NextResponse.json({ id: order.id }, { status: 201 });
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} catch (e: any) {
		return NextResponse.json({ error: e.message ?? "failed" }, { status: 400 });
	}
}
