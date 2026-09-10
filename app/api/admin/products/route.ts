import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { createProduct, listProducts, parseProductCreate } from "@/lib/adminCatalog";
import { catalogResponse, readCatalogJson } from "@/lib/adminCatalogHttp";

export async function GET() {
	const authorization = await requireAdmin();
	if (!authorization.authorized) return authorization.response;
	return catalogResponse(listProducts);
}

export async function POST(req: NextRequest) {
	const authorization = await requireAdmin();
	if (!authorization.authorized) return authorization.response;
	return catalogResponse(async () => createProduct(parseProductCreate(await readCatalogJson(req))), 201);
}
