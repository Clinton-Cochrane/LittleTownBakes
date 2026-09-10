import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockFrom } = vi.hoisted(() => ({
	mockFrom: vi.fn(),
}));

vi.mock("@/lib/supabaseAdmin", () => ({
	getSupabaseAdmin: () => ({ from: mockFrom }),
}));

import { GET } from "./route";

type QueryResult = { data: unknown[] | null; error: { message: string } | null };

const categories = [
	{ id: "cookies", name: "Cookies", sort_order: 20 },
	{ id: "cakes", name: "Cakes", sort_order: 10 },
];

const products = [
	{
		id: "chocolate-cake",
		category_id: "cakes",
		name: "Chocolate Cake",
		description: "Rich chocolate cake",
		price_cents: 375,
		image: "/img/cupcake_chocolate.png",
		max_per_order: 6,
		is_archived: false,
		sort_order: 20,
	},
	{
		id: "apple-cake",
		category_id: "cakes",
		name: "Apple Cake",
		description: null,
		price_cents: 250,
		image: null,
		max_per_order: 12,
		is_archived: false,
		sort_order: 10,
	},
	{
		id: "past-cookie",
		category_id: "cookies",
		name: "Past Cookie",
		description: "A retired flavor",
		price_cents: 200,
		image: "/img/cookie_snickerdoodle.png",
		max_per_order: 24,
		is_archived: true,
		sort_order: 10,
	},
];

function queryResult(data: unknown[], error: QueryResult["error"] = null): QueryResult {
	return { data, error };
}

function setDatabaseResults({
	categoryRows = categories,
	productRows = products,
	inventoryRows = [],
	categoryError = null,
	productError = null,
	inventoryError = null,
}: {
	categoryRows?: unknown[];
	productRows?: unknown[];
	inventoryRows?: unknown[];
	categoryError?: QueryResult["error"];
	productError?: QueryResult["error"];
	inventoryError?: QueryResult["error"];
} = {}) {
	mockFrom.mockImplementation((table: string) => {
		if (table === "categories") {
			return { select: vi.fn().mockResolvedValue(queryResult(categoryRows, categoryError)) };
		}
		if (table === "products") {
			return { select: vi.fn().mockResolvedValue(queryResult(productRows, productError)) };
		}
		if (table === "product_inventory") {
			return { select: vi.fn().mockResolvedValue(queryResult(inventoryRows, inventoryError)) };
		}
		throw new Error(`Unexpected table ${table}`);
	});
}

describe("GET /api/menu", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubEnv("MENU_DATA_SOURCE", "");
		setDatabaseResults();
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("returns the deterministic fixture without querying Supabase when explicitly enabled", async () => {
		vi.stubEnv("MENU_DATA_SOURCE", "fixture");

		const response = await GET();
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(mockFrom).not.toHaveBeenCalled();
		expect(body.categories.map((category: { id: string }) => category.id)).toEqual([
			"cake-pops",
			"cookies",
		]);
		expect(body.items.map((item: { id: string }) => item.id)).toEqual([
			"birthday-cake-pop",
			"chocolate-cake-pop",
			"chocolate-chip-cookie",
			"snickerdoodle-cookie",
		]);
		expect(body.items.find((item: { id: string }) => item.id === "snickerdoodle-cookie"))
			.toMatchObject({ remaining: 0, available: false, availability: { inStock: false } });
		expect(body.archivedItems.map((item: { id: string }) => item.id)).toEqual([
			"red-velvet-cake-pop",
		]);
	});

	it("does not select fixture data in production", async () => {
		vi.stubEnv("NODE_ENV", "production");
		vi.stubEnv("MENU_DATA_SOURCE", "fixture");

		const response = await GET();

		expect(response.status).toBe(200);
		expect(mockFrom).toHaveBeenCalledWith("categories");
		expect((await response.json()).items.map((item: { id: string }) => item.id)).toContain("apple-cake");
	});

	it("maps active database products into the existing API contract", async () => {
		setDatabaseResults({
			inventoryRows: [{ product_id: "chocolate-cake", quantity_on_hand: 4 }],
		});

		const response = await GET();
		const body = await response.json();
		const item = body.items.find((candidate: { id: string }) => candidate.id === "chocolate-cake");

		expect(response.status).toBe(200);
		expect(item).toMatchObject({
			id: "chocolate-cake",
			categoryId: "cakes",
			name: "Chocolate Cake",
			description: "Rich chocolate cake",
			basePrice: 3.75,
			image: "/img/cupcake_chocolate.png",
			maxPerOrder: 6,
			sortOrder: 20,
			isArchived: false,
			remaining: 4,
			available: true,
			availability: { inStock: true },
		});
	});

	it("returns archived products only in archivedItems", async () => {
		const response = await GET();
		const body = await response.json();

		expect(body.items.map((item: { id: string }) => item.id)).not.toContain("past-cookie");
		expect(body.archivedItems.map((item: { id: string }) => item.id)).toEqual(["past-cookie"]);
	});

	it("keeps a zero-stock active product visible but unavailable", async () => {
		setDatabaseResults({
			inventoryRows: [{ product_id: "apple-cake", quantity_on_hand: 0 }],
		});

		const response = await GET();
		const body = await response.json();
		const item = body.items.find((candidate: { id: string }) => candidate.id === "apple-cake");

		expect(item).toMatchObject({
			remaining: 0,
			available: false,
			availability: { inStock: false },
		});
	});

	it("sorts categories and products deterministically", async () => {
		setDatabaseResults({
			productRows: [
				{ ...products[0], id: "z-cake", name: "Same Name", sort_order: 10 },
				{ ...products[0], id: "a-cake", name: "Same Name", sort_order: 10 },
				products[1],
			],
		});

		const response = await GET();
		const body = await response.json();

		expect(body.categories.map((category: { id: string }) => category.id)).toEqual(["cakes", "cookies"]);
		expect(body.items.map((item: { id: string }) => item.id)).toEqual(["apple-cake", "a-cake", "z-cake"]);
	});

	it("returns an empty compatible catalog when the database has no catalog rows", async () => {
		setDatabaseResults({ categoryRows: [], productRows: [] });

		const response = await GET();

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ categories: [], items: [], archivedItems: [] });
	});

	it("returns a controlled error when a catalog query fails", async () => {
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
		setDatabaseResults({ productError: { message: "database unavailable" } });

		const response = await GET();

		expect(response.status).toBe(503);
		expect(await response.json()).toEqual({
			error: "Menu is currently unavailable. Please try again later.",
			code: "MENU_SOURCE_UNAVAILABLE",
		});
		expect(consoleError).toHaveBeenCalled();
		consoleError.mockRestore();
	});

	it("returns a controlled error instead of silently marking everything sold out when inventory fails", async () => {
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
		setDatabaseResults({ inventoryError: { message: "inventory unavailable" } });

		const response = await GET();

		expect(response.status).toBe(503);
		expect(await response.json()).toMatchObject({ code: "MENU_SOURCE_UNAVAILABLE" });
		consoleError.mockRestore();
	});
});
