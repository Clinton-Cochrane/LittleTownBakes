import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { FulfillmentStatus, OrderRecord } from "@/lib/orderTypes";
import { isValidTrackingToken, toPublicOrderTracking } from "@/lib/orderTracking";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

function notFound() {
	return new NextResponse("Not Found", { status: 404, headers: NO_STORE_HEADERS });
}

export async function GET(
	_req: NextRequest,
	context: { params: Promise<{ token: string }> },
) {
	const { token } = await context.params;
	if (!isValidTrackingToken(token)) return notFound();

	const supabase = getSupabaseAdmin();
	const { data, error } = await supabase
		.from("orders")
		.select("status, payload")
		.eq("tracking_token", token)
		.single();

	if (error || !data) return notFound();

	const payload = data.payload as Pick<OrderRecord, "payment" | "items" | "totals">;
	const order = toPublicOrderTracking(data.status as FulfillmentStatus, payload);
	return NextResponse.json(order, { headers: NO_STORE_HEADERS });
}
