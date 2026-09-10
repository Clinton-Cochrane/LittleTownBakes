import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdmin: vi.fn() }));
import {
	CatalogRequestError,
	parseCategoryCreate,
	parseCategoryPatch,
	parseCategoryReorder,
	parseProductCreate,
	parseProductPatch,
	parseProductReorder,
} from "./adminCatalog";

function expectInvalid(action: () => unknown, message: string) {
	expect(action).toThrowError(new CatalogRequestError(400, message));
}

describe("admin catalog validation", () => {
	it("normalizes a valid product create request", () => {
		expect(parseProductCreate({
			name: "  Chocolate Cake  ",
			description: " Rich ",
			priceCents: 0,
			categoryId: " cakes ",
			maxPerOrder: 6,
			image: null,
		})).toEqual({
			name: "Chocolate Cake",
			description: "Rich",
			priceCents: 0,
			categoryId: "cakes",
			maxPerOrder: 6,
			image: null,
		});
	});

	it.each([-1, 1.5, Number.MAX_SAFE_INTEGER + 1])("rejects invalid price %s", (priceCents) => {
		expectInvalid(
			() => parseProductCreate({ name: "Cake", priceCents, categoryId: "cakes", maxPerOrder: 1 }),
			"priceCents must be a non-negative safe integer no greater than 2147483647"
		);
	});

	it("rejects blank names and invalid max-per-order values", () => {
		expectInvalid(
			() => parseProductCreate({ name: "  ", priceCents: 100, categoryId: "cakes", maxPerOrder: 1 }),
			"name must be a nonblank string"
		);
		expectInvalid(
			() => parseProductCreate({ name: "Cake", priceCents: 100, categoryId: "cakes", maxPerOrder: 0 }),
			"maxPerOrder must be a positive safe integer no greater than 2147483647"
		);
	});

	it("rejects client-controlled product fields", () => {
		expectInvalid(
			() => parseProductCreate({ id: "chosen", name: "Cake", priceCents: 100, categoryId: "cakes" }),
			"Unknown or immutable field: id"
		);
		expectInvalid(() => parseProductPatch({ isArchived: true }), "Unknown or immutable field: isArchived");
	});

	it("keeps omitted PATCH fields omitted while accepting explicit null image", () => {
		expect(parseProductPatch({ name: " New name ", image: null })).toEqual({
			name: "New name",
			image: null,
		});
	});

	it("validates image references", () => {
		expectInvalid(() => parseProductPatch({ image: "  " }), "image must be a nonblank string or null");
		expect(parseProductPatch({ image: " /img/cake.png " })).toEqual({ image: "/img/cake.png" });
	});

	it("normalizes category create and patch requests", () => {
		expect(parseCategoryCreate({ name: " Cakes " })).toEqual({ name: "Cakes" });
		expect(parseCategoryPatch({ name: " Cupcakes " })).toEqual({ name: "Cupcakes" });
		expectInvalid(() => parseCategoryCreate({ id: "cakes", name: "Cakes" }), "Unknown or immutable field: id");
		expectInvalid(() => parseCategoryPatch({ name: " " }), "name must be a nonblank string");
	});

	it("validates exact, duplicate-free reorder lists", () => {
		expect(parseProductReorder({ categoryId: " cakes ", productIds: ["a", "b"] })).toEqual({
			categoryId: "cakes",
			productIds: ["a", "b"],
		});
		expect(parseCategoryReorder({ categoryIds: ["cakes", "cookies"] })).toEqual({
			categoryIds: ["cakes", "cookies"],
		});
		expectInvalid(
			() => parseProductReorder({ categoryId: "cakes", productIds: ["a", "a"] }),
			"productIds must not contain duplicates"
		);
		expectInvalid(
			() => parseCategoryReorder({ categoryIds: ["cakes", 2] }),
			"categoryIds must contain only nonblank strings"
		);
	});
});
