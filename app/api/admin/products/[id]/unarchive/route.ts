import { requireWritableAdmin } from "@/lib/adminAuth";
import { setProductArchived } from "@/lib/adminCatalog";
import { catalogResponse } from "@/lib/adminCatalogHttp";

export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
	const authorization = await requireWritableAdmin();
	if (!authorization.authorized) return authorization.response;
	const { id } = await context.params;
	return catalogResponse(() => setProductArchived(id, false));
}
