import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), create: vi.fn(), list: vi.fn(), update: vi.fn(), reorder: vi.fn() }));
vi.mock("@/lib/adminAuth", () => ({ requireAdmin: mocks.auth }));
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdmin: vi.fn() }));
vi.mock("@/lib/adminCatalog", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/lib/adminCatalog")>();
	return {
		...actual,
		createCategory: mocks.create,
		listCategories: mocks.list,
		updateCategory: mocks.update,
		reorderCategories: mocks.reorder,
	};
});

import { GET, POST } from "./route";
import { PATCH } from "./[id]/route";
import { POST as REORDER } from "./reorder/route";

function request(path: string, body: unknown) {
	return new NextRequest(`http://localhost${path}`, { method: "POST", body: JSON.stringify(body) });
}

describe("admin category routes", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.auth.mockResolvedValue({ authorized: true, admin: { id: "admin" } });
		mocks.create.mockResolvedValue({ id: "generated-category", name: "Cakes" });
		mocks.list.mockResolvedValue([]);
		mocks.update.mockResolvedValue({ id: "stable-category", name: "Cupcakes" });
		mocks.reorder.mockResolvedValue([]);
	});

	it("requires admin authentication", async () => {
		mocks.auth.mockResolvedValue({
			authorized: false,
			response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
		});
		expect((await GET()).status).toBe(403);
		expect((await POST(request("/api/admin/categories", { name: "Cakes" }))).status).toBe(403);
		expect(mocks.create).not.toHaveBeenCalled();
	});

	it("creates and renames categories without accepting IDs", async () => {
		const created = await POST(request("/api/admin/categories", { name: " Cakes " }));
		const renamed = await PATCH(
			request("/api/admin/categories/stable-category", { name: " Cupcakes " }),
			{ params: Promise.resolve({ id: "stable-category" }) }
		);

		expect(created.status).toBe(201);
		expect(renamed.status).toBe(200);
		expect(mocks.create).toHaveBeenCalledWith({ name: "Cakes" });
		expect(mocks.update).toHaveBeenCalledWith("stable-category", { name: "Cupcakes" });
	});

	it("forwards a validated full category order", async () => {
		const response = await REORDER(request("/api/admin/categories/reorder", { categoryIds: ["b", "a"] }));

		expect(response.status).toBe(200);
		expect(mocks.reorder).toHaveBeenCalledWith(["b", "a"]);
	});
});
