import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { parseCategoryReorder, reorderCategories } from "@/lib/adminCatalog";
import { catalogResponse, readCatalogJson } from "@/lib/adminCatalogHttp";

export async function POST(req: NextRequest) {
	const authorization = await requireAdmin();
	if (!authorization.authorized) return authorization.response;
	return catalogResponse(async () => {
		const input = parseCategoryReorder(await readCatalogJson(req));
		return reorderCategories(input.categoryIds);
	});
}
