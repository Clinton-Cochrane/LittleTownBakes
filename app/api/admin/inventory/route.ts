import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { setProductInventory } from "@/lib/inventoryUpsert";
import { getLocalInventory } from "@/lib/localData";
import { isLocalMode, localMutationUnavailable } from "@/lib/localMode";

export async function GET() {
	const authorization = await requireAdmin();
	if (!authorization.authorized) return authorization.response;
	if (isLocalMode()) return NextResponse.json(await getLocalInventory());

	const { data, error } = await supabaseAdmin
		.from("product_inventory")
		.select("*")
		.order("product_id", { ascending: true });

	if (error) return NextResponse.json({ error: error.message }, { status: 400 });
	return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
	const authorization = await requireAdmin();
	if (!authorization.authorized) return authorization.response;
	if (isLocalMode()) return localMutationUnavailable();

	const body = await req.json();
	const { product_id, quantity_on_hand } = body;

	if (typeof product_id !== "string" || !product_id.trim()) {
		return NextResponse.json({ error: "product_id is required" }, { status: 400 });
	}
	if (!Number.isSafeInteger(quantity_on_hand) || quantity_on_hand < 0 || quantity_on_hand > 2147483647) {
		return NextResponse.json(
			{ error: "quantity_on_hand must be a non-negative integer" },
			{ status: 400 }
		);
	}

	const result = await setProductInventory({
		product_id: product_id.trim(),
		quantity_on_hand,
	});
	if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
	return NextResponse.json(result.data);
}
