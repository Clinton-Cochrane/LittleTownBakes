import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function requireAdmin(req: NextRequest): NextResponse | null {
	const key = (req.headers.get("x-admin-key") ?? "").trim();
	const expectedKey = (process.env.ADMIN_KEY ?? "").trim();
	if (!expectedKey || key !== expectedKey) return new NextResponse("Unauthorized", { status: 401 });
	return null;
}

export async function GET(req: NextRequest) {
	const err = requireAdmin(req);
	if (err) return err;

	const { data, error } = await supabaseAdmin
		.from("flavor_requests")
		.select("*")
		.order("created_at", { ascending: false });

	if (error) return NextResponse.json({ error: error.message }, { status: 400 });
	return NextResponse.json(data ?? []);
}

export async function PATCH(req: NextRequest) {
	const err = requireAdmin(req);
	if (err) return err;

	const body = await req.json();
	const { id, status } = body;

	if (!id || !["pending", "notified", "ignored"].includes(status)) {
		return NextResponse.json({ error: "id and status (pending|notified|ignored) required" }, { status: 400 });
	}

	const { data, error } = await supabaseAdmin
		.from("flavor_requests")
		.update({ status })
		.eq("id", id)
		.select()
		.single();

	if (error) return NextResponse.json({ error: error.message }, { status: 400 });
	return NextResponse.json(data);
}
