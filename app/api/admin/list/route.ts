import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { AdminOrderRecord, OrderRecord } from "@/lib/orderTypes";

/**
 * Admin list orders API.
 * Returns orders with id, status, createdAt from DB columns (source of truth)
 * merged with payload (customer, items, totals).
 */
export async function GET(req: NextRequest) {
	const authorization = await requireAdmin();
	if (!authorization.authorized) return authorization.response;

	const supabase = getSupabaseAdmin();
	const statusFilter = req.nextUrl.searchParams.get("status") ?? undefined;

	let query = supabase
		.from("orders")
		.select("id, tracking_token, created_at, status, payload")
		.order("created_at", { ascending: false });

	if (statusFilter) {
		query = query.eq("status", statusFilter);
	}

	const { data, error } = await query;

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 400 });
	}

	const rows = data ?? [];
	const orders: AdminOrderRecord[] = rows.map((row) => {
		const payload = row.payload as Record<string, unknown>;
		return {
			id: row.id,
			trackingToken: row.tracking_token,
			createdAt: (row.created_at ?? payload?.createdAt) as string,
			fulfillmentStatus: row.status as OrderRecord["fulfillmentStatus"],
			payment: payload.payment as OrderRecord["payment"],
			customer: (payload?.customer ?? { name: "", email: "" }) as OrderRecord["customer"],
			pickup: payload.pickup as OrderRecord["pickup"],
			items: (payload?.items ?? []) as OrderRecord["items"],
			totals: payload.totals as OrderRecord["totals"],
		};
	});

	return NextResponse.json(orders);
}
