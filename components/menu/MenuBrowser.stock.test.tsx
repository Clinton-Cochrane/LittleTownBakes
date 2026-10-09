// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CartProvider } from "@/components/cart/useCart";
import CartLine from "@/components/cart/CartLine";
import MenuPage from "@/components/pages/MenuPage";
import type { MenuResponse } from "@/lib/menuCatalog";

const { loadMenu } = vi.hoisted(() => ({ loadMenu: vi.fn() }));
vi.mock("@/lib/menuLoader", () => ({ loadMenu, refreshMenu: loadMenu }));

function catalog(remaining: number, maxPerOrder = 24): MenuResponse {
	return {
		categories: [{ id: "cookies", name: "Cookies" }],
		items: [{
			id: "cookie", name: "Cookie", categoryId: "cookies", basePrice: 2,
			remaining, maxPerOrder, available: remaining > 0,
			availability: { inStock: remaining > 0 },
		}],
		archivedItems: [],
	};
}

function renderMenu() {
	return render(<CartProvider><MenuPage /><CartLine itemId="cookie" onRemove={vi.fn()} /></CartProvider>);
}

beforeEach(() => {
	vi.clearAllMocks();
	localStorage.clear();
});
afterEach(cleanup);

describe("customer menu stock", () => {
	it.each([12, 1])("carries %i remaining from the menu response through to the card", async (remaining) => {
		loadMenu.mockResolvedValue(catalog(remaining));
		renderMenu();
		expect(await screen.findByText(`${remaining} left`)).toBeTruthy();
		expect(screen.getByRole("button", { name: "Add Cookie to cart" })).toBeTruthy();
	});

	it.each([[12, 24, 12], [1, 24, 1], [12, 6, 6]])(
		"caps menu and new cart controls at stock %i and order limit %i", async (remaining, maxPerOrder, limit) => {
			const user = userEvent.setup();
			loadMenu.mockResolvedValue(catalog(remaining, maxPerOrder));
			renderMenu();
			await user.click(await screen.findByRole("button", { name: "Add Cookie to cart" }));
			const card = within(screen.getByRole("article", { name: "Cookie" }));
			const input = card.getByRole("spinbutton", { name: "Set Cookie quantity" }) as HTMLInputElement;
			expect(input.max).toBe(String(limit));
			fireEvent.change(input, { target: { value: "99" } });
			expect(input.value).toBe(String(limit));
			expect((card.getByRole("button", { name: `Increase Cookie quantity to ${limit + 1}` }) as HTMLButtonElement).disabled).toBe(true);
			expect(card.getByText(`${remaining} left`)).toBeTruthy();

			const cart = within(screen.getByRole("article", { name: "Cookie line" }));
			const cartInput = cart.getByRole("spinbutton", { name: "Set Cookie quantity" }) as HTMLInputElement;
			expect(cartInput.max).toBe(String(limit));
			fireEvent.change(cartInput, { target: { value: "99" } });
			expect(cartInput.value).toBe(String(limit));
		},
	);

	it("limits menu controls for an existing cart when the server advertises less stock", async () => {
		localStorage.setItem("cb_cart_v1", JSON.stringify([
			{ id: "cookie", name: "Cookie", price: 2, qty: 2, maxPerOrder: 24 },
		]));
		loadMenu.mockResolvedValue(catalog(1));
		renderMenu();
		await screen.findByText("1 left");
		const card = within(screen.getByRole("article", { name: "Cookie" }));
		expect((card.getByRole("button", { name: "Increase Cookie quantity to 3" }) as HTMLButtonElement).disabled).toBe(true);
		const input = card.getByRole("spinbutton", { name: "Set Cookie quantity" }) as HTMLInputElement;
		fireEvent.change(input, { target: { value: "99" } });
		expect(input.value).toBe("1");
		const cart = within(screen.getByRole("article", { name: "Cookie line" }));
		expect((cart.getByRole("spinbutton") as HTMLInputElement).max).toBe("1");
	});

	it("allows an existing cart to use freshly advertised stock after a refill", async () => {
		const user = userEvent.setup();
		localStorage.setItem("cb_cart_v1", JSON.stringify([
			{ id: "cookie", name: "Cookie", price: 2, qty: 1, maxPerOrder: 1 },
		]));
		loadMenu.mockResolvedValue(catalog(5));
		renderMenu();
		await screen.findByText("5 left");
		const card = within(screen.getByRole("article", { name: "Cookie" }));
		await user.click(card.getByRole("button", { name: "Increase Cookie quantity to 2" }));
		expect((card.getByRole("spinbutton") as HTMLInputElement).value).toBe("2");
		const cart = within(screen.getByRole("article", { name: "Cookie line" }));
		expect((cart.getByRole("spinbutton") as HTMLInputElement).max).toBe("5");
	});

	it.each([0, 2])("keeps a zero-stock product visible with demand action when cart quantity is %i", async (qty) => {
		localStorage.setItem("cb_cart_v1", JSON.stringify([
			{ id: "cookie", name: "Cookie", price: 2, qty, maxPerOrder: 24 },
		]));
		loadMenu.mockResolvedValue(catalog(0));
		renderMenu();
		await screen.findByText("Sold Out");
		const card = within(screen.getByRole("article", { name: "Cookie" }));
		expect(card.getByRole("button", { name: "Bummed I missed this" })).toBeTruthy();
		expect(card.queryByRole("button", { name: "Add Cookie to cart" })).toBeNull();
		expect(card.queryByRole("spinbutton")).toBeNull();
	});
});
