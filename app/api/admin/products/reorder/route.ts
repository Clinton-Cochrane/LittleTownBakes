import { NextRequest } from "next/server";
import { requireWritableAdmin } from "@/lib/adminAuth";
import { parseProductReorder, reorderProducts } from "@/lib/adminCatalog";
import { catalogResponse, readCatalogJson } from "@/lib/adminCatalogHttp";

export async function POST(req: NextRequest) {
	const authorization = await requireWritableAdmin();
	if (!authorization.authorized) return authorization.response;
	return catalogResponse(async () => {
		const input = parseProductReorder(await readCatalogJson(req));
		return reorderProducts(input.categoryId, input.productIds);
	});
}
