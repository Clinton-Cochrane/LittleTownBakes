import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
	auth: vi.fn(),
	create: vi.fn(),
	list: vi.fn(),
}));

vi.mock("@/lib/adminAuth", () => ({ requireAdmin: mocks.auth }));
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdmin: vi.fn() }));
vi.mock("@/lib/adminCatalog", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/lib/adminCatalog")>();
	return { ...actual, createProduct: mocks.create, listProducts: mocks.list };
});

import { GET, POST } from "./route";

function request(body: unknown) {
	return new NextRequest("http://localhost/api/admin/products", {
		method: "POST",
		body: JSON.stringify(body),
	});
}

describe("/api/admin/products", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.auth.mockResolvedValue({ authorized: true, admin: { id: "admin" } });
		mocks.list.mockResolvedValue([{
			id: "product-1", soldCount: 12, demandCount: 5, currentDemandCount: 2,
		}]);
		mocks.create.mockResolvedValue({ id: "generated-id", isArchived: false, quantityOnHand: 0 });
	});

	it("requires admin authentication for reads and mutations", async () => {
		mocks.auth.mockResolvedValue({
			authorized: false,
			response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
		});

		expect((await GET()).status).toBe(401);
		expect((await POST(request({ name: "Cake" }))).status).toBe(401);
		expect(mocks.list).not.toHaveBeenCalled();
		expect(mocks.create).not.toHaveBeenCalled();
	});

	it("creates an active zero-stock product from editable fields", async () => {
		const response = await POST(request({
			name: "Cake",
			description: "Good cake",
			priceCents: 0,
			categoryId: "cakes",
			maxPerOrder: 4,
			image: null,
		}));

		expect(response.status).toBe(201);
		expect(mocks.create).toHaveBeenCalledWith({
			name: "Cake",
			description: "Good cake",
			priceCents: 0,
			categoryId: "cakes",
			maxPerOrder: 4,
			image: null,
		});
		expect(await response.json()).toMatchObject({ id: "generated-id", isArchived: false, quantityOnHand: 0 });
	});

	it("returns sales and demand aggregates in the existing product response", async () => {
		const response = await GET();
		expect(await response.json()).toEqual([{
			id: "product-1", soldCount: 12, demandCount: 5, currentDemandCount: 2,
		}]);
	});

	it("returns predictable validation errors", async () => {
		const response = await POST(request({ name: " ", priceCents: -1, categoryId: "cakes" }));

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: "name must be a nonblank string" });
		expect(mocks.create).not.toHaveBeenCalled();
	});
});
