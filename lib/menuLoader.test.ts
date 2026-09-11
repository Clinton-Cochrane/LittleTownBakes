import { afterEach, describe, expect, it, vi } from "vitest";
import { createMenuLoader, MENU_CACHE_TTL_MS } from "./menuLoader";
import type { MenuResponse } from "./menuCatalog";

const catalog: MenuResponse = {
	categories: [{ id: "cookies", name: "Cookies", sortOrder: 10 }],
	items: [{
		id: "cookie",
		name: "Cookie",
		categoryId: "cookies",
		basePrice: 2,
		availability: { inStock: true },
	}],
	archivedItems: [],
};

afterEach(() => {
	vi.useRealTimers();
});

	describe("shared menu loader", () => {
	it("returns the exact same Promise to concurrent callers", async () => {
		let resolveRequest!: (value: MenuResponse) => void;
		const loadCatalog = vi.fn(() => new Promise<MenuResponse>((resolve) => {
			resolveRequest = resolve;
		}));
		const loader = createMenuLoader({ loadCatalog });

		const firstRequest = loader.loadMenu();
		const secondRequest = loader.loadMenu();

		expect(secondRequest).toBe(firstRequest);
		expect(loadCatalog).toHaveBeenCalledTimes(1);
		resolveRequest(catalog);
		await firstRequest;
	});

	it("shares one underlying request between a Home preload and Menu access", async () => {
		let resolveRequest!: (value: MenuResponse) => void;
		const loadCatalog = vi.fn(() => new Promise<MenuResponse>((resolve) => {
			resolveRequest = resolve;
		}));
		const loader = createMenuLoader({ loadCatalog });

		loader.preloadMenu();
		const menuRequest = loader.loadMenu();

		expect(loadCatalog).toHaveBeenCalledTimes(1);
		resolveRequest(catalog);
		await expect(menuRequest).resolves.toEqual(catalog);
		expect(loadCatalog).toHaveBeenCalledTimes(1);
	});

	it("reuses a successful preload while the cache is fresh", async () => {
		let now = 1_000;
		const loadCatalog = vi.fn().mockResolvedValue(catalog);
		const loader = createMenuLoader({ loadCatalog, now: () => now });

		loader.preloadMenu();
		await loader.loadMenu();
		now += MENU_CACHE_TTL_MS - 1;

		await expect(loader.loadMenu()).resolves.toEqual(catalog);
		expect(loadCatalog).toHaveBeenCalledTimes(1);
	});

	it("fetches fresh data after the cache expires", async () => {
		let now = 1_000;
		const refreshedCatalog = { ...catalog, items: [] };
		const loadCatalog = vi.fn()
			.mockResolvedValueOnce(catalog)
			.mockResolvedValueOnce(refreshedCatalog);
		const loader = createMenuLoader({ loadCatalog, now: () => now });

		await loader.loadMenu();
		now += MENU_CACHE_TTL_MS;

		await expect(loader.loadMenu()).resolves.toEqual(refreshedCatalog);
		expect(loadCatalog).toHaveBeenCalledTimes(2);
	});

	it("retries transient failures and returns a later successful attempt", async () => {
		vi.useFakeTimers();
		const loadCatalog = vi.fn()
			.mockRejectedValueOnce(new Error("temporary one"))
			.mockRejectedValueOnce(new Error("temporary two"))
			.mockResolvedValueOnce(catalog);
		const loader = createMenuLoader({ loadCatalog });

		const request = loader.loadMenu();
		await vi.runAllTimersAsync();

		await expect(request).resolves.toEqual(catalog);
		expect(loadCatalog).toHaveBeenCalledTimes(3);
	});

	it("stops after three attempts and does not retain the failure", async () => {
		vi.useFakeTimers();
		const loadCatalog = vi.fn().mockRejectedValue(new Error("unavailable"));
		const loader = createMenuLoader({ loadCatalog });

		const failedRequest = loader.loadMenu();
		const failedExpectation = expect(failedRequest).rejects.toThrow("unavailable");
		await vi.runAllTimersAsync();
		await failedExpectation;
		expect(loadCatalog).toHaveBeenCalledTimes(3);

		loadCatalog.mockResolvedValueOnce(catalog);
		const recoveredRequest = loader.loadMenu();
		await expect(recoveredRequest).resolves.toEqual(catalog);
		expect(loadCatalog).toHaveBeenCalledTimes(4);
	});

	it("keeps exhausted preloads silent and permits a later Menu load", async () => {
		vi.useFakeTimers();
		const loadCatalog = vi.fn()
			.mockRejectedValueOnce(new Error("one"))
			.mockRejectedValueOnce(new Error("two"))
			.mockRejectedValueOnce(new Error("three"))
			.mockResolvedValueOnce(catalog);
		const loader = createMenuLoader({ loadCatalog });

		expect(() => loader.preloadMenu()).not.toThrow();
		await vi.runAllTimersAsync();
		await expect(loader.loadMenu()).resolves.toEqual(catalog);
		expect(loadCatalog).toHaveBeenCalledTimes(4);
	});

	it("manual refresh starts a new bounded sequence and can recover", async () => {
		vi.useFakeTimers();
		const loadCatalog = vi.fn()
			.mockRejectedValueOnce(new Error("one"))
			.mockRejectedValueOnce(new Error("two"))
			.mockRejectedValueOnce(new Error("three"))
			.mockResolvedValueOnce(catalog);
		const loader = createMenuLoader({ loadCatalog });

		const failedRequest = loader.loadMenu();
		const failedExpectation = expect(failedRequest).rejects.toThrow("three");
		await vi.runAllTimersAsync();
		await failedExpectation;

		await expect(loader.refreshMenu()).resolves.toEqual(catalog);
		expect(loadCatalog).toHaveBeenCalledTimes(4);
	});
});
