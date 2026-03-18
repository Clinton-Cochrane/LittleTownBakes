import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkRateLimit } from "@/lib/rateLimit";
import { validateFlavorRequestPayload } from "@/lib/flavorRequestValidation";

export async function POST(req: NextRequest) {
	const rateLimitResponse = checkRateLimit(req);
	if (rateLimitResponse) return rateLimitResponse;

	try {
		let body: unknown;
		try {
			body = await req.json();
		} catch {
			return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
		}

		const validation = validateFlavorRequestPayload(body);
		if (!validation.ok) {
			return NextResponse.json({ error: validation.error }, { status: 400 });
		}

		const { item_id, customer_email, customer_name, notes } = validation.data;

		const { data, error } = await supabaseAdmin
			.from("flavor_requests")
			.insert({
				item_id,
				customer_email,
				customer_name,
				notes,
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
