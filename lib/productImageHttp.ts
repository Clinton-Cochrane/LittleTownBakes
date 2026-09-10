import { NextRequest, NextResponse } from "next/server";
import { ProductImageError } from "./productImageRules";

export async function readProductImageJson(req: NextRequest) {
	try {
		const value = await req.json();
		if (!value || typeof value !== "object" || Array.isArray(value)) {
			throw new ProductImageError(400, "Request body must be an object.");
		}
		return value as Record<string, unknown>;
	} catch (error) {
		if (error instanceof ProductImageError) throw error;
		throw new ProductImageError(400, "Invalid JSON body.");
	}
}

export async function productImageResponse<T>(operation: () => Promise<T>) {
	try {
		return NextResponse.json(await operation());
	} catch (error) {
		if (error instanceof ProductImageError) {
			return NextResponse.json({ error: error.message }, { status: error.status });
		}
		console.error("[product image] unexpected server failure", { stage: "route", error });
		return NextResponse.json({ error: "Product photo operation failed. Please try again." }, { status: 500 });
	}
}
