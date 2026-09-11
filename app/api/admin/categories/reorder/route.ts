import { NextRequest } from "next/server";
import { requireWritableAdmin } from "@/lib/adminAuth";
import { parseCategoryReorder, reorderCategories } from "@/lib/adminCatalog";
import { catalogResponse, readCatalogJson } from "@/lib/adminCatalogHttp";

export async function POST(req: NextRequest) {
	const authorization = await requireWritableAdmin();
	if (!authorization.authorized) return authorization.response;
	return catalogResponse(async () => {
		const input = parseCategoryReorder(await readCatalogJson(req));
		return reorderCategories(input.categoryIds);
	});
}
