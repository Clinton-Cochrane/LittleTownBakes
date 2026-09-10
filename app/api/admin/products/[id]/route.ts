import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { parseProductPatch, updateProduct } from "@/lib/adminCatalog";
import { catalogResponse, readCatalogJson } from "@/lib/adminCatalogHttp";

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
	const authorization = await requireAdmin();
	if (!authorization.authorized) return authorization.response;
	const { id } = await context.params;
	return catalogResponse(async () => updateProduct(id, parseProductPatch(await readCatalogJson(req))));
}
