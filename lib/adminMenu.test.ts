import { describe, expect, it, vi } from "vitest";
import {
	ProductActionQueue,
	parseRefillAmount,
	splitMenuProducts,
	type AdminMenuProduct,
} from "./adminMenu";

function product(overrides: Partial<AdminMenuProduct>): AdminMenuProduct {
	return {
		id: "product",
		categoryId: "cakes",
		name: "Cake",
		description: "",
		priceCents: 300,
		image: null,
		maxPerOrder: 6,
		isArchived: false,
		sortOrder: 10,
		quantityOnHand: 4,
		...overrides,
	};
}

describe("admin menu product views", () => {
	it("keeps active sold-out products visible after stocked products", () => {
		const views = splitMenuProducts([
			product({ id: "sold-out", name: "Sold Out", quantityOnHand: 0 }),
			product({ id: "stocked", name: "Stocked", quantityOnHand: 3 }),
		]);

		expect(views.active.map((item) => item.id)).toEqual(["stocked", "sold-out"]);
		expect(views.active[1].quantityOnHand).toBe(0);
	});

	it("separates archived products into Past Flavors", () => {
		const views = splitMenuProducts([
			product({ id: "active" }),
			product({ id: "past", isArchived: true, quantityOnHand: 8 }),
		]);

		expect(views.active.map((item) => item.id)).toEqual(["active"]);
		expect(views.archived.map((item) => item.id)).toEqual(["past"]);
	});
});

describe("ProductActionQueue", () => {
	it("serializes rapid actions for one product without losing any", async () => {
		let releaseFirst: (() => void) | undefined;
		let markFirstStarted: (() => void) | undefined;
		const firstGate = new Promise<void>((resolve) => {
			releaseFirst = resolve;
		});
		const firstStarted = new Promise<void>((resolve) => {
			markFirstStarted = resolve;
		});
		const calls: string[] = [];
		const queue = new ProductActionQueue();

		const first = queue.enqueue("cake", async () => {
			calls.push("first:start");
			markFirstStarted?.();
			await firstGate;
			calls.push("first:end");
		});
		const second = queue.enqueue("cake", async () => {
			calls.push("second");
		});

		await firstStarted;
		expect(calls).toEqual(["first:start"]);
		releaseFirst?.();
		await Promise.all([first, second]);
		expect(calls).toEqual(["first:start", "first:end", "second"]);
	});

	it("does not globally block actions for different products", async () => {
		const queue = new ProductActionQueue();
		const cakeAction = vi.fn(async () => undefined);
		const cookieAction = vi.fn(async () => undefined);

		await Promise.all([
			queue.enqueue("cake", cakeAction),
			queue.enqueue("cookie", cookieAction),
		]);

		expect(cakeAction).toHaveBeenCalledOnce();
		expect(cookieAction).toHaveBeenCalledOnce();
	});
});

describe("parseRefillAmount", () => {
	it.each(["0", "12", " 4 "])("accepts non-negative whole amount %s", (value) => {
		expect(parseRefillAmount(value)).toBe(Number(value));
	});

	it.each(["", "-1", "1.5", "abc"])("rejects invalid amount %s", (value) => {
		expect(parseRefillAmount(value)).toBeNull();
	});
});
