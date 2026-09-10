import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { createCategory, listCategories, parseCategoryCreate } from "@/lib/adminCatalog";
import { catalogResponse, readCatalogJson } from "@/lib/adminCatalogHttp";

export async function GET() {
	const authorization = await requireAdmin();
	if (!authorization.authorized) return authorization.response;
	return catalogResponse(listCategories);
}

export async function POST(req: NextRequest) {
	const authorization = await requireAdmin();
	if (!authorization.authorized) return authorization.response;
	return catalogResponse(async () => createCategory(parseCategoryCreate(await readCatalogJson(req))), 201);
}
