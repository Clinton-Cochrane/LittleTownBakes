import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import MenuSection from "./MenuSection";
import type { Section } from "@/lib/menuCatalog";

describe("MenuSection responsive grid", () => {
	it("adds columns only when cards have enough room for their contents", () => {
		const section: Section = {
			category: { id: "cakes", name: "Cakes", sortOrder: 1 },
			items: [{
				id: "cake",
				name: "Cake",
				categoryId: "cakes",
				basePrice: 4,
				availability: { inStock: true },
			}],
		};

		const html = renderToStaticMarkup(createElement(MenuSection, {
			section,
			isItemAvailable: () => true,
			formatCurrency: () => "$4.00",
			onAddToCart: vi.fn(),
			getQty: () => 0,
			onSetQty: vi.fn(),
		}));

		expect(html).toContain("grid-cols-[repeat(auto-fit,minmax(min(100%,22rem),1fr))]");
		expect(html).not.toMatch(/(?:sm|md|lg):grid-cols-/);
	});
});
