import { NextRequest } from "next/server";
import { requireWritableAdmin } from "@/lib/adminAuth";
import { parseCategoryPatch, updateCategory } from "@/lib/adminCatalog";
import { catalogResponse, readCatalogJson } from "@/lib/adminCatalogHttp";

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
	const authorization = await requireWritableAdmin();
	if (!authorization.authorized) return authorization.response;
	const { id } = await context.params;
	return catalogResponse(async () => updateCategory(id, parseCategoryPatch(await readCatalogJson(req))));
}
