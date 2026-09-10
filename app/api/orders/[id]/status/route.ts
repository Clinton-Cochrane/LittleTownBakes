import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { FulfillmentStatus, OrderRecord, PaymentStatus } from "@/lib/orderTypes";
import { notifyStatusChange } from "@/lib/notify";
import { isValidOrderStatusTransition } from "@/lib/orderStatusFlow";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
	const authorization = await requireAdmin();
	if (!authorization.authorized) return authorization.response;

	const { id } = await context.params;
	let rawBody: unknown;
	try {
		rawBody = await req.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
	}
	if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
		return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
	}
	const body = rawBody as { fulfillmentStatus?: FulfillmentStatus; paymentStatus?: PaymentStatus };
	const fulfillmentStatus = body.fulfillmentStatus;
	const paymentStatus = body.paymentStatus;
	if ((fulfillmentStatus ? 1 : 0) + (paymentStatus ? 1 : 0) !== 1) {
		return NextResponse.json({ error: "Submit exactly one fulfillment or payment status" }, { status: 400 });
	}
	if (paymentStatus && paymentStatus !== "PENDING" && paymentStatus !== "PAID") {
		return NextResponse.json({ error: "Invalid payment status" }, { status: 400 });
	}

	const supabase = getSupabaseAdmin();
	const { data, error } = await supabase.from("orders").select("status, payload").eq("id", id).single();
	if (error || !data) return new NextResponse("Not found", { status: 404 });

	const previous = { ...(data.payload as OrderRecord), fulfillmentStatus: data.status as FulfillmentStatus };
	if (paymentStatus) {
		if (previous.fulfillmentStatus === "COMPLETED" || previous.fulfillmentStatus === "CANCELED") {
			return NextResponse.json({ error: "Payment cannot be changed after fulfillment is closed" }, { status: 400 });
		}
		const updated: OrderRecord = { ...previous, payment: { ...previous.payment, status: paymentStatus } };
		const { data: changed, error: updateError } = await supabase.from("orders").update({ payload: updated })
			.eq("id", id).eq("status", previous.fulfillmentStatus).select("id").maybeSingle();
		if (updateError) return NextResponse.json({ error: "Could not update payment status" }, { status: 400 });
		if (!changed) return NextResponse.json({ error: "Order changed; refresh and try again" }, { status: 409 });
		return NextResponse.json({ ok: true });
	}

	if (!fulfillmentStatus || (previous.fulfillmentStatus !== fulfillmentStatus && !isValidOrderStatusTransition(previous.fulfillmentStatus, fulfillmentStatus))) {
		return NextResponse.json({ error: "Invalid fulfillment status change" }, { status: 400 });
	}
	const updated: OrderRecord = { ...previous, fulfillmentStatus };
	if (fulfillmentStatus === "CANCELED") {
		const { data: cancellation, error: cancelError } = await supabase.rpc("cancel_order_and_restore_inventory", { p_order_id: id });
		if (cancelError) { console.error("[orders] cancellation failed", cancelError); return NextResponse.json({ error: "Could not cancel order" }, { status: 400 }); }
		if (cancellation?.restored !== false) notifyStatusChange(updated).catch(console.warn);
		return NextResponse.json({ ok: true });
	}

	const { data: changed, error: updateError } = await supabase.from("orders").update({ status: fulfillmentStatus, payload: updated })
		.eq("id", id).eq("status", previous.fulfillmentStatus).select("id").maybeSingle();
	if (updateError) return NextResponse.json({ error: "Could not update fulfillment status" }, { status: 400 });
	if (!changed) return NextResponse.json({ error: "Order changed; refresh and try again" }, { status: 409 });
	notifyStatusChange(updated).catch(console.warn);
	return NextResponse.json({ ok: true });
}
