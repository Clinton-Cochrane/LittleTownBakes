import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { incrementLocalDemand, LocalDemandError } from "@/lib/localData";
import { isLocalMode } from "@/lib/localMode";

export async function POST(request: NextRequest) {
	let body: unknown;
	try { body = await request.json(); } catch {
		return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
	}

	const productId = (body as { productId?: unknown } | null)?.productId;
	if (typeof productId !== "string" || !productId.trim()) {
		return NextResponse.json({ error: "productId is required" }, { status: 400 });
	}
	if (isLocalMode()) {
		try {
			return NextResponse.json(await incrementLocalDemand(productId.trim()));
		} catch (error) {
			if (error instanceof LocalDemandError && error.code === "PRODUCT_NOT_FOUND") {
				return NextResponse.json({ error: "Product not found" }, { status: 404 });
			}
			if (error instanceof LocalDemandError && error.code === "PRODUCT_AVAILABLE") {
				return NextResponse.json({ error: "This product is currently available" }, { status: 409 });
			}
			throw error;
		}
	}

	const { data, error } = await getSupabaseAdmin().rpc("increment_product_demand", { p_product_id: productId.trim() });
	if (error?.message.includes("DEMAND_PRODUCT_NOT_FOUND")) {
		return NextResponse.json({ error: "Product not found" }, { status: 404 });
	}
	if (error?.message.includes("DEMAND_PRODUCT_AVAILABLE")) {
		return NextResponse.json({ error: "This product is currently available" }, { status: 409 });
	}
	if (error || !Array.isArray(data) || !data[0]) {
		console.error("[demand-signals] increment failed", error);
		return NextResponse.json({ error: "Could not save your response" }, { status: 500 });
	}

	return NextResponse.json({ eventType: data[0].event_type, currentDemandCount: Number(data[0].demand_count) });
}
