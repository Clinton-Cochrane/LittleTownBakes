import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { adjustProductInventory } from "@/lib/inventoryUpsert";

export async function POST(request: NextRequest) {
	const authorization = await requireAdmin();
	if (!authorization.authorized) return authorization.response;

	const body = await request.json().catch(() => null);
	const productId = body?.product_id;
	const delta = body?.delta;
	if (typeof productId !== "string" || !productId.trim()) {
		return NextResponse.json({ error: "Choose a product to update." }, { status: 400 });
	}
	if (!Number.isSafeInteger(delta) || delta < -2_147_483_647 || delta > 2_147_483_647) {
		return NextResponse.json({ error: "The amount must be a whole number." }, { status: 400 });
	}

	const result = await adjustProductInventory(productId.trim(), delta);
	if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
	return NextResponse.json(result.data);
}
