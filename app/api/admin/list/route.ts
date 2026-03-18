import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { OrderRecord } from "@/lib/orderTypes";

/**
 * Admin list orders API.
 * Returns orders with id, status, createdAt from DB columns (source of truth)
 * merged with payload (customer, items, totals).
 */
export async function GET(req: NextRequest) {
	const adminKey = req.headers.get("x-admin-key")?.trim() ?? "";
	const expectedKey = process.env.ADMIN_KEY ?? "";

	if (!expectedKey) {
		return NextResponse.json(
			{ error: "ADMIN_KEY not configured. Add it to .env.local" },
			{ status: 500 }
		);
	}
	if (adminKey !== expectedKey) {
		return new NextResponse("Unauthorized", { status: 401 });
	}

	const supabase = getSupabaseAdmin();
	const statusFilter = req.nextUrl.searchParams.get("status") ?? undefined;

	let query = supabase
		.from("orders")
		.select("id, created_at, status, payload")
		.order("created_at", { ascending: false });

	if (statusFilter) {
		query = query.eq("status", statusFilter);
	}

	const { data, error } = await query;

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 400 });
	}

	const rows = data ?? [];
	const orders: OrderRecord[] = rows.map((row) => {
		const payload = row.payload as Record<string, unknown>;
		return {
			id: row.id,
			createdAt: (row.created_at ?? payload?.createdAt) as string,
			status: row.status as OrderRecord["status"],
			customer: (payload?.customer ?? { name: "", email: "" }) as OrderRecord["customer"],
			items: (payload?.items ?? []) as OrderRecord["items"],
			totals: (payload?.totals ?? { subtotal: 0, tax: 0, total: 0 }) as OrderRecord["totals"],
		};
	});

	return NextResponse.json(orders);
}