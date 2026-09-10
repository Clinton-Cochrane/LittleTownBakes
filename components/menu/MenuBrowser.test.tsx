import { describe, expect, it, vi } from "vitest";
import { loadMenuCatalog } from "./MenuBrowser";

const validCatalog = {
	categories: [{ id: "cookies", name: "Cookies", sortOrder: 10 }],
	items: [{
		id: "cookie",
		name: "Cookie",
		categoryId: "cookies",
		basePrice: 2,
		availability: { inStock: true },
		remaining: 4,
		available: true,
	}],
	archivedItems: [],
};

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json" },
	});
}

describe("MenuBrowser menu loading", () => {
	it("returns a successful menu response", async () => {
		const fetchMenu = vi.fn().mockResolvedValue(jsonResponse(validCatalog));

		await expect(loadMenuCatalog(fetchMenu)).resolves.toEqual(validCatalog);
		expect(fetchMenu).toHaveBeenCalledWith("/api/menu", { cache: "no-store" });
	});

	it("surfaces the API message for a non-2xx response", async () => {
		const fetchMenu = vi.fn().mockResolvedValue(jsonResponse({
			error: "Menu is currently unavailable. Please try again later.",
		}, 503));

		await expect(loadMenuCatalog(fetchMenu)).rejects.toThrow(
			"Menu is currently unavailable. Please try again later."
		);
	});

	it("turns a rejected fetch into a visible connection error", async () => {
		const fetchMenu = vi.fn().mockRejectedValue(new TypeError("fetch failed"));

		await expect(loadMenuCatalog(fetchMenu)).rejects.toThrow(
			"Could not connect to the menu. Please check your connection and try again."
		);
	});

	it.each([
		["non-JSON", new Response("upstream broke", { status: 200 })],
		["invalid shape", jsonResponse({ categories: [], items: "not-an-array" })],
	])("turns a %s response into a visible invalid-response error", async (_label, response) => {
		const fetchMenu = vi.fn().mockResolvedValue(response);

		await expect(loadMenuCatalog(fetchMenu)).rejects.toThrow(
			"The menu service returned an invalid response. Please try again."
		);
	});
});
