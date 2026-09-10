import { describe, it, expect } from "vitest";
import { buildSections, formatCurrency } from "./menuCatalog";
import type { MenuCatalog } from "./menuCatalog";

describe("formatCurrency", () => {
	it("formats USD", () => {
		expect(formatCurrency(2.5)).toBe("$2.50");
	});

	it("formats zero", () => {
		expect(formatCurrency(0)).toBe("$0.00");
	});

	it("formats large numbers", () => {
		expect(formatCurrency(1234.56)).toBe("$1,234.56");
	});
});

describe("buildSections", () => {
	it("groups items by category", () => {
		const catalog: MenuCatalog = {
			categories: [
				{ id: "a", name: "A", sortOrder: 1 },
				{ id: "b", name: "B", sortOrder: 2 },
			],
			items: [
				{ id: "1", name: "Item 1", categoryId: "a", basePrice: 1, availability: { inStock: true } },
				{ id: "2", name: "Item 2", categoryId: "b", basePrice: 2, availability: { inStock: true } },
				{ id: "3", name: "Item 3", categoryId: "a", basePrice: 3, availability: { inStock: true } },
			],
		};
		const sections = buildSections(catalog);
		expect(sections).toHaveLength(2);
		expect(sections[0].category.id).toBe("a");
		expect(sections[0].items).toHaveLength(2);
		expect(sections[1].category.id).toBe("b");
		expect(sections[1].items).toHaveLength(1);
	});

	it("sorts categories by sortOrder", () => {
		const catalog: MenuCatalog = {
			categories: [
				{ id: "z", name: "Z", sortOrder: 3 },
				{ id: "a", name: "A", sortOrder: 1 },
			],
			items: [
				{ id: "1", name: "Z item", categoryId: "z", basePrice: 1, availability: { inStock: true } },
				{ id: "2", name: "A item", categoryId: "a", basePrice: 1, availability: { inStock: true } },
			],
		};
		const sections = buildSections(catalog);
		expect(sections[0].category.id).toBe("a");
		expect(sections[1].category.id).toBe("z");
	});

	it("omits categories with no current products", () => {
		const catalog: MenuCatalog = {
			categories: [
				{ id: "empty", name: "Empty", sortOrder: 1 },
				{ id: "current", name: "Current", sortOrder: 2 },
			],
			items: [
				{ id: "1", name: "Cake", categoryId: "current", basePrice: 1, availability: { inStock: false } },
			],
		};

		expect(buildSections(catalog).map((section) => section.category.id)).toEqual(["current"]);
	});

	it("sorts products by sortOrder, then name", () => {
		const catalog: MenuCatalog = {
			categories: [{ id: "a", name: "A", sortOrder: 1 }],
			items: [
				{ id: "3", name: "Beta", categoryId: "a", basePrice: 1, sortOrder: 2, availability: { inStock: true } },
				{ id: "2", name: "Zulu", categoryId: "a", basePrice: 1, sortOrder: 1, availability: { inStock: true } },
				{ id: "1", name: "Alpha", categoryId: "a", basePrice: 1, sortOrder: 1, availability: { inStock: true } },
			],
		};

		const sections = buildSections(catalog);

		expect(sections[0].items.map((item) => item.id)).toEqual(["1", "2", "3"]);
	});

	it("skips orphan items", () => {
		const catalog: MenuCatalog = {
			categories: [{ id: "a", name: "A", sortOrder: 1 }],
			items: [
				{ id: "1", name: "Valid", categoryId: "a", basePrice: 1, availability: { inStock: true } },
				{ id: "2", name: "Orphan", categoryId: "nonexistent", basePrice: 2, availability: { inStock: true } },
			],
		};
		const sections = buildSections(catalog);
		expect(sections[0].items).toHaveLength(1);
		expect(sections[0].items[0].id).toBe("1");
	});
});
