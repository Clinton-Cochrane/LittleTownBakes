import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), initiate: vi.fn(), finalize: vi.fn() }));
vi.mock("@/lib/adminAuth", () => ({ requireAdmin: mocks.auth }));
vi.mock("@/lib/productImages", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/lib/productImages")>();
	return { ...actual, initiateProductImageUpload: mocks.initiate, finalizeProductImage: mocks.finalize };
});

import { POST as INITIATE } from "./image-upload/route";
import { POST as FINALIZE } from "./image/route";

const context = { params: Promise.resolve({ id: "product-1" }) };
function request(path: string, body: unknown) {
	return new NextRequest(`http://localhost${path}`, { method: "POST", body: JSON.stringify(body) });
}

describe("admin product image routes", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.auth.mockResolvedValue({ authorized: true, admin: { id: "admin" } });
		mocks.initiate.mockResolvedValue({ bucket: "product-images", objectPath: "products/product-1/cake-a3f91c.jpg", token: "secret-token" });
		mocks.finalize.mockResolvedValue({ id: "product-1", image: "https://example.supabase.co/image.jpg" });
	});

	it("allows an authenticated admin to initiate a valid upload", async () => {
		const response = await INITIATE(request("/image-upload", { mimeType: "image/jpeg", fileSize: 2048 }), context);
		expect(response.status).toBe(200);
		expect(mocks.initiate).toHaveBeenCalledWith("product-1", { mimeType: "image/jpeg", fileSize: 2048 });
		expect(await response.json()).toMatchObject({ bucket: "product-images", objectPath: expect.any(String), token: "secret-token" });
	});

	it.each([INITIATE, FINALIZE])("rejects unauthenticated image operations", async (handler) => {
		mocks.auth.mockResolvedValue({
			authorized: false,
			response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
		});
		const response = await handler(request("/image", {}), context);
		expect(response.status).toBe(401);
		expect(mocks.initiate).not.toHaveBeenCalled();
		expect(mocks.finalize).not.toHaveBeenCalled();
	});

	it("finalizes an uploaded object through the authenticated product workflow", async () => {
		const body = { objectPath: "products/product-1/cake-a3f91c.jpg", mimeType: "image/jpeg", fileSize: 2048 };
		const response = await FINALIZE(request("/image", body), context);
		expect(response.status).toBe(200);
		expect(mocks.finalize).toHaveBeenCalledWith("product-1", body);
	});
});
