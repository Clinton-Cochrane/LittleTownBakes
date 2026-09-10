import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { readProductImageJson, productImageResponse } from "@/lib/productImageHttp";
import { initiateProductImageUpload } from "@/lib/productImages";

type Context = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: Context) {
	const authorization = await requireAdmin();
	if (!authorization.authorized) return authorization.response;
	return productImageResponse(async () => {
		const [{ id }, body] = await Promise.all([context.params, readProductImageJson(req)]);
		return initiateProductImageUpload(id, { mimeType: body.mimeType, fileSize: body.fileSize });
	});
}
