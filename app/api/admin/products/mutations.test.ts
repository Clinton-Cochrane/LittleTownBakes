import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), update: vi.fn(), archive: vi.fn(), reorder: vi.fn() }));
vi.mock("@/lib/adminAuth", () => ({ requireAdmin: mocks.auth }));
vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdmin: vi.fn() }));
vi.mock("@/lib/adminCatalog", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/lib/adminCatalog")>();
	return { ...actual, updateProduct: mocks.update, setProductArchived: mocks.archive, reorderProducts: mocks.reorder };
});

import { PATCH } from "./[id]/route";
import { POST as ARCHIVE } from "./[id]/archive/route";
import { POST as UNARCHIVE } from "./[id]/unarchive/route";
import { POST as REORDER } from "./reorder/route";

const context = { params: Promise.resolve({ id: "stable-id" }) };
function request(path: string, body: unknown) {
	return new NextRequest(`http://localhost${path}`, { method: "POST", body: JSON.stringify(body) });
}

describe("admin product mutations", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.auth.mockResolvedValue({ authorized: true, admin: { id: "admin" } });
		mocks.update.mockResolvedValue({ id: "stable-id", name: "New" });
		mocks.archive.mockResolvedValue({ id: "stable-id" });
		mocks.reorder.mockResolvedValue([]);
	});

	it("PATCH forwards only supplied editable fields and keeps the route identity", async () => {
		const response = await PATCH(request("/api/admin/products/stable-id", { name: " New " }) as NextRequest, context);

		expect(response.status).toBe(200);
		expect(mocks.update).toHaveBeenCalledWith("stable-id", { name: "New" });
	});

	it("rejects attempts to replace product identity", async () => {
		const response = await PATCH(request("/api/admin/products/stable-id", { id: "replacement" }) as NextRequest, context);

		expect(response.status).toBe(400);
		expect(mocks.update).not.toHaveBeenCalled();
	});

	it("archive and unarchive only request archive-state changes and are repeatable", async () => {
		await ARCHIVE(new Request("http://localhost") , context);
		await ARCHIVE(new Request("http://localhost") , context);
		await UNARCHIVE(new Request("http://localhost") , context);
		await UNARCHIVE(new Request("http://localhost") , context);

		expect(mocks.archive.mock.calls).toEqual([
			["stable-id", true], ["stable-id", true], ["stable-id", false], ["stable-id", false],
		]);
	});

	it("validates and forwards category-scoped ordered product IDs", async () => {
		const response = await REORDER(request("/api/admin/products/reorder", {
			categoryId: "cakes",
			productIds: ["second", "first"],
		}));

		expect(response.status).toBe(200);
		expect(mocks.reorder).toHaveBeenCalledWith("cakes", ["second", "first"]);
	});
});
