import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(
	_req: NextRequest,
	context: { params: Promise<{ id: string }> }
) {
	const { id } = await context.params;

	const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim());
	if (!supabaseConfigured) {
		// Local dev without .env: fake order so pages can be exercised. Production must never serve mock orders.
		if (process.env.NODE_ENV === "production") {
			return NextResponse.json(
				{ error: "Order lookup is not configured (missing NEXT_PUBLIC_SUPABASE_URL)." },
				{ status: 503 }
			);
		}
		return NextResponse.json({
			id,
			status: "MOCK",
			customer: { name: "Test Customer" },
			items: [],
			totals: { subtotal: 2500, tax: 200, total: 2700 },
			createdAt: new Date().toISOString(),
		});
	}

	const supabase = getSupabaseAdmin();
	const { data, error } = await supabase
		.from("orders")
		.select("payload")
		.eq("id", id)
		.single();

	if (error || !data) {
		return new NextResponse("Not Found", { status: 404 });
	}

	return NextResponse.json(data.payload);
}
