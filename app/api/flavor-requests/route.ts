import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const { item_id, customer_email, customer_name, notes } = body;

		if (!item_id || !customer_email?.trim()) {
			return NextResponse.json({ error: "item_id and customer_email required" }, { status: 400 });
		}

		const { data, error } = await supabaseAdmin
			.from("flavor_requests")
			.insert({
				item_id,
				customer_email: customer_email.trim(),
				customer_name: customer_name?.trim() || null,
				notes: notes?.trim() || null,
				status: "pending",
			})
			.select()
			.single();

		if (error) return NextResponse.json({ error: error.message }, { status: 400 });
		return NextResponse.json({ id: data.id }, { status: 201 });
	} catch (e) {
		console.error("[flavor-requests]", e);
		return NextResponse.json({ error: "Request failed" }, { status: 500 });
	}
}
