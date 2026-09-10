import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockFrom, mockGetSupabaseAdmin } = vi.hoisted(() => ({
	mockFrom: vi.fn(),
	mockGetSupabaseAdmin: vi.fn(),
}));

vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdmin: mockGetSupabaseAdmin }));

import {
	CatalogRequestError,
	createCategory,
	createProduct,
	setProductArchived,
	updateProduct,
} from "./adminCatalog";

const productRow = {
	id: "generated-product-id",
	category_id: "cakes",
	name: "Cake",
	description: "",
	price_cents: 0,
	image: null,
	max_per_order: 1,
	is_archived: false,
	sort_order: 30,
	created_at: "created",
	updated_at: "updated",
};

describe("admin catalog persistence", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetSupabaseAdmin.mockReturnValue({ from: mockFrom });
	});

	it("generates product identity, inserts active state, and relies on trigger-created inventory", async () => {
		let productCall = 0;
		const insert = vi.fn().mockResolvedValue({ error: null });
		mockFrom.mockImplementation((table: string) => {
			if (table === "categories") {
				return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: "cakes" }, error: null }) }) }) };
			}
			if (table === "product_inventory") {
				return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { quantity_on_hand: 0 }, error: null }) }) }) };
			}
			productCall++;
			if (productCall === 1) {
				return { select: () => ({ eq: () => ({ order: () => ({ limit: () => ({ maybeSingle: async () => ({ data: { sort_order: 20 }, error: null }) }) }) }) }) };
			}
			if (productCall === 2) return { insert };
			return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: productRow, error: null }) }) }) };
		});

		const created = await createProduct({
			name: "Cake", description: "", priceCents: 0, categoryId: "cakes", maxPerOrder: 1, image: null,
		}, () => "generated-product-id");

		expect(insert).toHaveBeenCalledWith(expect.objectContaining({
			id: "generated-product-id",
			is_archived: false,
			sort_order: 30,
		}));
		expect(mockFrom.mock.calls.filter(([table]) => table === "product_inventory")).toHaveLength(1);
		expect(created).toMatchObject({ id: "generated-product-id", isArchived: false, quantityOnHand: 0 });
	});

	it("generates category identity", async () => {
		const insert = vi.fn().mockReturnValue({
			select: () => ({ single: async () => ({
				data: { id: "generated-category-id", name: "Cakes", sort_order: 10, created_at: "created", updated_at: "updated" },
				error: null,
			}) }),
		});
		let call = 0;
		mockFrom.mockImplementation(() => {
			call++;
			if (call === 1) return { select: () => ({ order: () => ({ limit: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }) };
			return { insert };
		});

		const created = await createCategory({ name: "Cakes" }, () => "generated-category-id");

		expect(insert).toHaveBeenCalledWith({ id: "generated-category-id", name: "Cakes", sort_order: 10 });
		expect(created.id).toBe("generated-category-id");
	});

	it("maps duplicate category names to a safe conflict", async () => {
		let call = 0;
		mockFrom.mockImplementation(() => {
			call++;
			if (call === 1) return { select: () => ({ order: () => ({ limit: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }) };
			return {
				insert: () => ({ select: () => ({ single: async () => ({ data: null, error: { code: "23505", message: "raw database detail" } }) }) }),
			};
		});

		await expect(createCategory({ name: "Cakes" }, () => "generated-category-id")).rejects.toEqual(
			new CatalogRequestError(409, "Category name already exists")
		);
	});

	it("rejects an unknown product without attempting an update", async () => {
		const update = vi.fn();
		mockFrom.mockReturnValue({
			select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
			update,
		});

		await expect(updateProduct("unknown", { name: "New" })).rejects.toEqual(
			new CatalogRequestError(404, "Product not found")
		);
		expect(update).not.toHaveBeenCalled();
	});

	it("moves a product without changing identity, inventory, or archive state", async () => {
		const update = vi.fn();
		let productCall = 0;
		mockFrom.mockImplementation((table: string) => {
			if (table === "categories") return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: "cookies" }, error: null }) }) }) };
			if (table === "product_inventory") return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { quantity_on_hand: 7 }, error: null }) }) }) };
			productCall++;
			if (productCall === 1) return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: "generated-product-id", category_id: "cakes" }, error: null }) }) }) };
			if (productCall === 2) return { select: () => ({ eq: () => ({ order: () => ({ limit: () => ({ maybeSingle: async () => ({ data: { sort_order: 40 }, error: null }) }) }) }) }) };
			if (productCall === 3) {
				return { update: (values: unknown) => { update(values); return { eq: async () => ({ error: null }) }; } };
			}
			return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { ...productRow, category_id: "cookies", is_archived: true }, error: null }) }) }) };
		});

		const moved = await updateProduct("generated-product-id", { categoryId: "cookies", name: "Moved" });

		expect(update).toHaveBeenCalledWith({ name: "Moved", category_id: "cookies", sort_order: 50 });
		expect(moved).toMatchObject({ id: "generated-product-id", categoryId: "cookies", isArchived: true, quantityOnHand: 7 });
	});

	it.each([true, false])("archive state %s writes only archive state and retains the image", async (archivedState) => {
		const update = vi.fn();
		const image = "https://bakery.supabase.co/storage/v1/object/public/product-images/products/cake/cake-a3f91c.webp";
		let productCall = 0;
		mockFrom.mockImplementation((table: string) => {
			if (table === "product_inventory") return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { quantity_on_hand: 9 }, error: null }) }) }) };
			productCall++;
			if (productCall === 1) return { update: (values: unknown) => { update(values); return { eq: () => ({ select: () => ({ maybeSingle: async () => ({ data: { id: productRow.id }, error: null }) }) }) }; } };
			return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { ...productRow, image, is_archived: archivedState }, error: null }) }) }) };
		});

		const archived = await setProductArchived(productRow.id, archivedState);

		expect(update).toHaveBeenCalledWith({ is_archived: archivedState });
		expect(archived).toMatchObject({ id: productRow.id, image, isArchived: archivedState, quantityOnHand: 9 });
	});
});
