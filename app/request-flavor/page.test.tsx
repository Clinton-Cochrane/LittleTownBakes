import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
	loadArchivedFlavors,
	PastFlavorsContent,
} from "./PastFlavorsContent";

const activeItem = {
	id: "current-cookie",
	name: "Current Cookie",
	categoryId: "cookies",
	basePrice: 2,
	availability: { inStock: true },
	remaining: 4,
	available: true,
};

const archivedItems = [
	{
		...activeItem,
		id: "red-velvet",
		name: "Red Velvet",
		description: "Cream cheese frosting.",
		image: "/img/red-velvet.png",
		isArchived: true,
		remaining: 0,
		available: false,
		availability: { inStock: false },
	},
	{
		...activeItem,
		id: "lemon",
		name: "Lemon",
		isArchived: true,
		remaining: 0,
		available: false,
		availability: { inStock: false },
	},
];

const validCatalog = {
	categories: [{ id: "cookies", name: "Cookies", sortOrder: 10 }],
	items: [activeItem],
	archivedItems,
};

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json" },
	});
}

function renderContent(props: Parameters<typeof PastFlavorsContent>[0]) {
	return renderToStaticMarkup(createElement(PastFlavorsContent, props));
}

describe("Past Flavors page", () => {
	it("shows an accessible loading state while the menu is requested", () => {
		const html = renderContent({ archivedItems: [], loading: true, error: null });

		expect(html).toContain('role="status"');
		expect(html).toContain('aria-busy="true"');
		expect(html).toContain("Loading past flavors");
	});

	it("does not collect contact details or promise notifications", () => {
		const html = renderContent({ archivedItems: [], loading: false, error: null });
		expect(html).not.toContain('type="email"');
		expect(html).not.toContain("Your name");
		expect(html).not.toContain("Notes");
		expect(html).not.toContain("notify");
		expect(html).not.toContain("let you know");
	});

	it("renders archived products deterministically with their details and demand action", () => {
		const html = renderContent({ archivedItems, loading: false, error: null });

		expect(html.indexOf("Red Velvet")).toBeLessThan(html.indexOf("Lemon"));
		expect(html).toContain("Cream cheese frosting.");
		expect(html).toContain('src="/img/red-velvet.png"');
		expect(html).toContain("Bring this back");
		expect(html).not.toContain("Current Cookie");
		expect(html).not.toContain("email");
		expect(html).not.toContain("name");
		expect(html).not.toContain("notes");
	});

	it("shows the genuine empty state only after a successful empty response", () => {
		const html = renderContent({ archivedItems: [], loading: false, error: null });

		expect(html).toContain("No past flavors at the moment");
		expect(html).not.toContain('role="alert"');
	});

	it("shows a deliberate error state instead of the empty state", () => {
		const html = renderContent({
			archivedItems: [],
			loading: false,
			error: "Menu is currently unavailable. Please try again later.",
		});

		expect(html).toContain('role="alert"');
		expect(html).toContain("Menu is currently unavailable");
		expect(html).not.toContain("No past flavors at the moment");
	});

	it("loads archived products without including active products", async () => {
		const fetchMenu = vi.fn().mockResolvedValue(jsonResponse(validCatalog));

		await expect(loadArchivedFlavors(fetchMenu)).resolves.toEqual(archivedItems);
		expect(fetchMenu).toHaveBeenCalledWith("/api/menu", { cache: "no-store" });
	});

	it.each([
		["a non-2xx response", jsonResponse({ error: "Menu unavailable" }, 500)],
		["malformed JSON", new Response("not JSON", { status: 200 })],
		["a malformed response", jsonResponse({ categories: [], items: [] })],
	])("rejects %s instead of treating it as an empty archive", async (_label, response) => {
		const fetchMenu = vi.fn().mockResolvedValue(response);

		await expect(loadArchivedFlavors(fetchMenu)).rejects.toThrow();
	});

	it("rejects a failed request instead of treating it as an empty archive", async () => {
		const fetchMenu = vi.fn().mockRejectedValue(new TypeError("fetch failed"));

		await expect(loadArchivedFlavors(fetchMenu)).rejects.toThrow("Could not connect to the menu");
	});
});
