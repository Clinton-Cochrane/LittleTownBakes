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
		.select("payload")
		.eq("id", id)
		.single();

	if (error || !data) return new NextResponse("Not found", { status: 404 });

	const previous = data.payload as OrderRecord;
	if (previous.status !== status && !isValidOrderStatusTransition(previous.status, status)) {
		return NextResponse.json(
			{
				error: `Invalid status change: ${previous.status} → ${status}. Follow the order workflow (e.g. paid before in progress, in progress before completed).`,
			},
			{ status: 400 }
		);
	}

	const updated: OrderRecord = { ...previous, status };

	const { error: upErr } = await supabase
		.from("orders")
		.update({ status, payload: updated })
		.eq("id", id);

	if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });

	notifyStatusChange(updated).catch(console.warn);
	return NextResponse.json({ ok: true });
}
