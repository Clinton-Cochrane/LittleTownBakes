import { NextRequest, NextResponse } from "next/server";
import { CatalogRequestError } from "@/lib/adminCatalog";

export async function readCatalogJson(req: NextRequest): Promise<unknown> {
	try {
		return await req.json();
	} catch {
		throw new CatalogRequestError(400, "Invalid JSON body");
	}
}

export async function catalogResponse<T>(operation: () => Promise<T>, status = 200) {
	try {
		return NextResponse.json(await operation(), { status });
	} catch (error) {
		if (error instanceof CatalogRequestError) {
			return NextResponse.json({ error: error.message }, { status: error.status });
		}
		console.error("[admin catalog] unexpected failure", error);
		return NextResponse.json({ error: "Catalog operation failed" }, { status: 500 });
	}
}
