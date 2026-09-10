import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { AdminMenuProduct } from "@/lib/adminMenu";
import { MenuProductCard, PastFlavorCard } from "./MenuProductCard";

function product(quantityOnHand: number): AdminMenuProduct {
	return {
		id: "chocolate-cake",
		categoryId: "cakes",
		name: "Chocolate Cake",
		description: "Rich chocolate cake",
		priceCents: 350,
		image: null,
		maxPerOrder: 6,
		isArchived: false,
		sortOrder: 10,
		quantityOnHand,
	};
}

describe("MenuProductCard", () => {
	it("renders the authoritative quantity with touch adjustment controls", () => {
		const html = renderToStaticMarkup(createElement(MenuProductCard, {
			product: product(12), onAdjust: vi.fn(), onEdit: vi.fn(), onArchive: vi.fn(),
		}));

		expect(html).toContain("12 available");
		expect(html).toContain("Remove one Chocolate Cake");
		expect(html).toContain("Add one Chocolate Cake");
		expect(html).toContain("h-12 w-12");
	});

	it("keeps a zero-stock active product visible and refillable", () => {
		const html = renderToStaticMarkup(createElement(MenuProductCard, {
			product: product(0), onAdjust: vi.fn(), onEdit: vi.fn(), onArchive: vi.fn(),
		}));

		expect(html).toContain("Chocolate Cake");
		expect(html).toContain("Sold Out · 0 available");
		expect(html).toContain("Refill");
		expect(html).toContain("disabled");
	});

	it("does not render quantity controls for a Past Flavor", () => {
		const html = renderToStaticMarkup(createElement(PastFlavorCard, {
			product: { ...product(8), isArchived: true }, onEdit: vi.fn(), onRestore: vi.fn(),
		}));

		expect(html).toContain("Restore");
		expect(html).not.toContain("Add one Chocolate Cake");
		expect(html).not.toContain("Refill");
	});
});
