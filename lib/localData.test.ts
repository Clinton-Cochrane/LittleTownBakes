import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLocalOrder, getLocalMenu, getLocalOrderByTrackingToken, incrementLocalDemand, type LocalData } from "./localData";

const pickupWindowId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const trackingToken = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
let directory: string;
let dataFile: string;

function testData(): LocalData {
	return {
		categories: [{ id: "cakes", name: "Cakes", sort_order: 10, created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" }],
		products: [{ id: "cake", category_id: "cakes", name: "Test Cake", description: "A test cake", price_cents: 2500, image: null, max_per_order: 4, is_archived: false, sort_order: 10, created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" }],
		inventory: [{ product_id: "cake", quantity_on_hand: 3 }],
		pickupWindows: [{ id: pickupWindowId, start_at: "2099-01-02T18:00:00.000Z", end_at: "2099-01-02T19:00:00.000Z", enabled: true, created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" }],
		orders: [],
	};
}

describe("local JSON data", () => {
	beforeEach(async () => {
		directory = await mkdtemp(path.join(tmpdir(), "little-town-bakes-local-"));
		dataFile = path.join(directory, "data.json");
		vi.stubEnv("LOCAL_DATA_FILE", dataFile);
		await writeFile(dataFile, JSON.stringify(testData()));
	});

	afterEach(async () => {
		vi.unstubAllEnvs();
		await rm(directory, { recursive: true, force: true });
	});

	it("maps JSON products and inventory into the public menu contract", async () => {
		const menu = await getLocalMenu();
		expect(menu.items[0]).toMatchObject({ id: "cake", basePrice: 25, remaining: 3, available: true });
	});

	it("creates an authoritative local order that can be tracked and reduces inventory", async () => {
		const result = await createLocalOrder({
			customer: { name: "Local Customer", email: "local@example.test" },
			payment: { method: "cash" },
			pickupWindowId,
			items: [{ productId: "cake", quantity: 2 }],
		}, { id: "ord_local_test", trackingToken, now: new Date("2026-01-01T00:00:00.000Z") });

		expect(result.order).toMatchObject({
			id: "ord_local_test",
			items: [{ productId: "cake", name: "Test Cake", unitPriceCents: 2500, quantity: 2, lineTotalCents: 5000 }],
			totals: { subtotalCents: 5000, totalCents: 5000 },
		});
		expect(await getLocalOrderByTrackingToken(trackingToken)).toMatchObject({ id: "ord_local_test" });
		const saved = JSON.parse(await readFile(dataFile, "utf8")) as LocalData;
		expect(saved.inventory[0].quantity_on_hand).toBe(1);
	});

	it("rejects orders that exceed local inventory without changing the file", async () => {
		await expect(createLocalOrder({
			customer: { name: "Local Customer", email: "local@example.test" },
			payment: { method: "cash" },
			pickupWindowId,
			items: [{ productId: "cake", quantity: 4 }],
		}, { id: "ord_local_test", trackingToken, now: new Date("2026-01-01T00:00:00.000Z") }))
			.rejects.toMatchObject({ code: "OUT_OF_STOCK" });
		expect((JSON.parse(await readFile(dataFile, "utf8")) as LocalData).orders).toEqual([]);
	});

	it("records demand for unavailable products", async () => {
		const data = testData();
		data.inventory[0].quantity_on_hand = 0;
		await writeFile(dataFile, JSON.stringify(data));
		expect(await incrementLocalDemand("cake")).toEqual({ eventType: "sold_out", currentDemandCount: 1 });
		expect(await incrementLocalDemand("cake")).toEqual({ eventType: "sold_out", currentDemandCount: 2 });
	});
});
