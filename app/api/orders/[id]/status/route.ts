import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { OrderRecord, OrderStatus } from "@/lib/orderTypes";
import { notifyStatusChange } from "@/lib/notify";
import { isValidOrderStatusTransition } from "@/lib/orderStatusFlow";

export async function POST(
	req: NextRequest,
	context: { params: Promise<{ id: string }> }
) {
	const authorization = await requireAdmin();
	if (!authorization.authorized) return authorization.response;

	const { id } = await context.params;
	const { status } = (await req.json()) as { status: OrderStatus };

	const supabase = getSupabaseAdmin();
	const { data, error } = await supabase
		.from("orders")
		.select("status, payload")
		.eq("id", id)
		.single();

	if (error || !data) return new NextResponse("Not found", { status: 404 });

	const previous = { ...(data.payload as OrderRecord), status: data.status as OrderStatus };
	if (previous.status !== status && !isValidOrderStatusTransition(previous.status, status)) {
		return NextResponse.json(
			{
				error: `Invalid status change: ${previous.status} → ${status}. Follow the order workflow (e.g. paid before in progress, in progress before completed).`,
			},
			{ status: 400 }
		);
	}

	const updated: OrderRecord = { ...previous, status };
	if (status === "CANCELED") {
		const { data: cancellation, error: cancelError } = await supabase.rpc("cancel_order_and_restore_inventory", {
			p_order_id: id,
		});
		if (cancelError) {
			return NextResponse.json({ error: cancelError.message }, { status: 400 });
		}
		if (cancellation?.restored !== false) notifyStatusChange(updated).catch(console.warn);
		return NextResponse.json({ ok: true });
	}

	const { data: changed, error: upErr } = await supabase
		.from("orders")
		.update({ status, payload: updated })
		.eq("id", id)
		.eq("status", previous.status)
		.select("id")
		.maybeSingle();

	if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });
	if (!changed) {
		return NextResponse.json({ error: "Order status changed; refresh and try again" }, { status: 409 });
	}

	notifyStatusChange(updated).catch(console.warn);
	return NextResponse.json({ ok: true });
}
