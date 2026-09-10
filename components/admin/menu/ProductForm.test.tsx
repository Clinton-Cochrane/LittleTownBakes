import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ProductForm } from "./ProductForm";
import type { AdminMenuProduct } from "@/lib/adminMenu";

const categories = [{ id: "cakes", name: "Cakes", sortOrder: 10 }];
const callbacks = { onCancel: vi.fn(), onSave: vi.fn(), onProductSaved: vi.fn(), onComplete: vi.fn() };

function render(product: AdminMenuProduct | null) {
	return renderToStaticMarkup(createElement(ProductForm, { product, categories, ...callbacks }));
}

describe("ProductForm photo controls", () => {
	it("shows a placeholder and phone-friendly Choose Photo picker for a new product", () => {
		const html = render(null);
		expect(html).toContain('src="/img/placeholder.svg"');
		expect(html).toContain("Choose Photo");
		expect(html).toContain('accept="image/jpeg,image/png,image/webp,image/gif"');
	});

	it("shows the current image and Replace Photo for an existing product", () => {
		const product: AdminMenuProduct = {
			id: "cake", categoryId: "cakes", name: "Cake", description: "", priceCents: 400,
			image: "/img/cake.png", maxPerOrder: 6, isArchived: false, sortOrder: 10, quantityOnHand: 2,
		};
		const html = render(product);
		expect(html).toContain('src="/img/cake.png"');
		expect(html).toContain("Replace Photo");
		expect(html).not.toContain("Delete Photo");
	});
});
