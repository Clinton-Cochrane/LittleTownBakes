import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import MenuCard from "./MenuCard";
import type { Item } from "@/lib/menuCatalog";

function render(image?: string) {
	const item: Item = {
		id: "cake",
		name: "Cake",
		categoryId: "cakes",
		basePrice: 4,
		image,
		availability: { inStock: true },
	};
	return renderToStaticMarkup(createElement(MenuCard, {
		item,
		available: true,
		formatCurrency: () => "$4.00",
		qty: 0,
		maxPerOrder: 6,
		onAdd: vi.fn(),
		onSetQty: vi.fn(),
	}));
}

describe("MenuCard product images", () => {
	it("renders the existing placeholder when a product has no image", () => {
		expect(render()).toContain('src="/img/placeholder.svg"');
	});

	it("renders a GIF URL directly so browser animation is preserved", () => {
		const gifUrl = "https://bakery.supabase.co/storage/v1/object/public/product-images/products/cake/cake-a3f91c.gif";
		expect(render(gifUrl)).toContain(`src="${gifUrl}"`);
	});
});

describe("MenuCard availability", () => {
	it("offers an anonymous demand action when sold out", () => {
		const item: Item = { id: "cake", name: "Cake", categoryId: "cakes", basePrice: 4, availability: { inStock: false } };
		const html = renderToStaticMarkup(createElement(MenuCard, {
			item, available: false, formatCurrency: () => "$4.00", qty: 0, maxPerOrder: 6,
			onAdd: vi.fn(), onSetQty: vi.fn(),
		}));
		expect(html).toContain("Sold Out");
		expect(html).toContain("Bummed I missed this");
		expect(html).not.toContain("Add To Cart");
	});

	it("keeps in-stock products orderable", () => {
		expect(render()).toContain("Add To Cart");
		expect(render()).not.toContain("Bummed I missed this");
	});
});
