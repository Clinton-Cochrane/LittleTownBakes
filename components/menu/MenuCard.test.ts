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
