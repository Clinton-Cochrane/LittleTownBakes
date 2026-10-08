// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminMenu } from "./AdminMenu";

const activeProducts = [
	{ id: "cookie", name: "Chocolate Chip" },
	{ id: "missing", name: "New Cookie" },
	{ id: "cake", name: "Vanilla Cake" },
];
const archivedProducts = [{ id: "past", name: "Past Flavor" }];

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function deferred() {
	let resolve!: () => void;
	const promise = new Promise<void>((done) => { resolve = done; });
	return { promise, resolve };
}

function inventoryFetch({
	exactGate,
	failExact = false,
	failAdjust = false,
}: {
	exactGate?: Promise<void>;
	failExact?: boolean;
	failAdjust?: boolean;
} = {}) {
	const quantities = new Map([["cookie", 4], ["cake", 2], ["past", 9]]);
	const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
		const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
		if (url === "/api/admin/products" && !init?.method) {
			return jsonResponse([...activeProducts, ...archivedProducts].map((item) => ({
				...item,
				categoryId: "cookies",
				description: "",
				priceCents: 350,
				image: null,
				maxPerOrder: 12,
				isArchived: archivedProducts.some((archived) => archived.id === item.id),
				sortOrder: 10,
				quantityOnHand: quantities.get(item.id) ?? 0,
				soldCount: 0,
				demandCount: 0,
				currentDemandCount: 0,
			})));
		}
		if (url === "/api/admin/categories" && !init?.method) {
			return jsonResponse([{ id: "cookies", name: "Cookies", sortOrder: 10 }]);
		}
		if (url === "/api/admin/inventory" && init?.method === "POST") {
			const body = JSON.parse(String(init.body)) as { product_id: string; quantity_on_hand: number };
			if (exactGate && body.product_id === "cookie") await exactGate;
			if (failExact) return jsonResponse({ error: "Exact save failed." }, 500);
			quantities.set(body.product_id, body.quantity_on_hand);
			return jsonResponse(body);
		}
		if (url === "/api/admin/inventory/adjust" && init?.method === "POST") {
			const body = JSON.parse(String(init.body)) as { product_id: string; delta: number };
			if (failAdjust) return jsonResponse({ error: "Adjustment failed." }, 500);
			const quantity_on_hand = (quantities.get(body.product_id) ?? 0) + body.delta;
			quantities.set(body.product_id, quantity_on_hand);
			return jsonResponse({ product_id: body.product_id, quantity_on_hand });
		}
		throw new Error(`Unexpected fetch: ${init?.method ?? "GET"} ${url}`);
	});
	return { fetchMock, quantities };
}

function mutationCalls(fetchMock: ReturnType<typeof vi.fn>, path?: string) {
	return fetchMock.mock.calls.filter(([url, init]) => init?.method === "POST" && (!path || url === path));
}

async function renderMenu(fetchMock: ReturnType<typeof vi.fn>) {
	vi.stubGlobal("fetch", fetchMock);
	const user = userEvent.setup();
	render(<AdminMenu />);
	await screen.findByRole("heading", { name: "Menu Management" });
	return user;
}

function quantity(name: string) {
	return screen.getByRole("textbox", { name: `${name} quantity` }) as HTMLInputElement;
}

beforeEach(() => {
	window.history.replaceState(null, "", "/admin/menu");
});

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

describe("Menu Management stock editor", () => {
	it("shows active and sold-out products with zero defaults, without bulk tools or stock filters", async () => {
		const { fetchMock } = inventoryFetch();
		await renderMenu(fetchMock);

		expect(screen.getByText("Chocolate Chip")).toBeTruthy();
		expect(screen.getByText("New Cookie")).toBeTruthy();
		expect(screen.queryByText("Past Flavor")).toBeNull();
		expect(quantity("New Cookie").value).toBe("0");
		expect(screen.queryByRole("heading", { name: "Bulk edit" })).toBeNull();
		expect(screen.queryByRole("button", { name: "Download CSV" })).toBeNull();
		expect(screen.queryByRole("button", { name: "Download JSON" })).toBeNull();
		expect(screen.queryByRole("button", { name: "Product template" })).toBeNull();
		expect(screen.queryByLabelText("Upload inventory file")).toBeNull();
		expect(screen.queryByRole("button", { name: "In Stock" })).toBeNull();
		expect(screen.getByRole("button", { name: "Add Product" })).toBeTruthy();
	});

	it("increments and decrements with atomic delta requests while keeping success quiet", async () => {
		const { fetchMock } = inventoryFetch();
		const user = await renderMenu(fetchMock);

		await user.click(screen.getByRole("button", { name: "Add one Chocolate Chip" }));
		await waitFor(() => expect(quantity("Chocolate Chip").value).toBe("5"));
		await user.click(screen.getByRole("button", { name: "Remove one Chocolate Chip" }));
		await waitFor(() => expect(quantity("Chocolate Chip").value).toBe("4"));

		const calls = mutationCalls(fetchMock, "/api/admin/inventory/adjust");
		expect(calls.map(([, init]) => JSON.parse(String(init?.body)).delta)).toEqual([1, -1]);
		expect(screen.queryByText("Inventory saved.")).toBeNull();
	});

	it("disables minus at zero, sends no decrement, and can increment a missing row", async () => {
		const { fetchMock } = inventoryFetch();
		const user = await renderMenu(fetchMock);
		const minus = screen.getByRole("button", { name: "Remove one New Cookie" }) as HTMLButtonElement;

		expect(minus.disabled).toBe(true);
		await user.click(minus);
		expect(mutationCalls(fetchMock)).toHaveLength(0);

		await user.click(screen.getByRole("button", { name: "Add one New Cookie" }));
		await waitFor(() => expect(quantity("New Cookie").value).toBe("1"));
		const adjustment = mutationCalls(fetchMock, "/api/admin/inventory/adjust");
		expect(JSON.parse(String(adjustment[0]?.[1]?.body))).toEqual({ product_id: "missing", delta: 1 });
	});

	it("sets an exact quantity on blur and skips an unchanged blur", async () => {
		const { fetchMock } = inventoryFetch();
		const user = await renderMenu(fetchMock);
		const input = quantity("Chocolate Chip");

		await user.click(input);
		await user.tab();
		expect(mutationCalls(fetchMock)).toHaveLength(0);

		await user.clear(input);
		await user.type(input, "25");
		await user.tab();
		await waitFor(() => expect(input.value).toBe("25"));
		const [url, init] = mutationCalls(fetchMock)[0]!;
		expect(url).toBe("/api/admin/inventory");
		expect(JSON.parse(String(init?.body))).toEqual({ product_id: "cookie", quantity_on_hand: 25 });
		expect(screen.queryByText("Inventory saved.")).toBeNull();
	});

	it("saves an exact quantity once when Enter is pressed", async () => {
		const { fetchMock } = inventoryFetch();
		const user = await renderMenu(fetchMock);
		const input = quantity("Chocolate Chip");
		await user.clear(input);
		await user.type(input, "18{Enter}");
		await waitFor(() => expect(mutationCalls(fetchMock, "/api/admin/inventory")).toHaveLength(1));
		expect(JSON.parse(String(mutationCalls(fetchMock)[0]?.[1]?.body))).toEqual({ product_id: "cookie", quantity_on_hand: 18 });
		await waitFor(() => expect(input.disabled).toBe(false));
		expect(input.value).toBe("18");
	});

	it.each(["", "-1", "1.5", "abc", "2147483648"])("rejects and reverts invalid quantity %j", async (value) => {
		const { fetchMock } = inventoryFetch();
		const user = await renderMenu(fetchMock);
		const input = quantity("Chocolate Chip");

		await user.clear(input);
		if (value) await user.type(input, value);
		await user.tab();

		expect(input.value).toBe("4");
		expect((await screen.findByRole("alert")).textContent).toContain("change was not saved");
		expect(mutationCalls(fetchMock)).toHaveLength(0);
	});

	it("resynchronizes and shows a row error after an exact-set failure", async () => {
		const { fetchMock } = inventoryFetch({ failExact: true });
		const user = await renderMenu(fetchMock);
		const input = quantity("Chocolate Chip");

		await user.clear(input);
		await user.type(input, "25");
		await user.tab();

		await waitFor(() => expect(input.value).toBe("4"));
		expect((await screen.findByRole("alert")).textContent).toContain("Exact save failed");
		expect(fetchMock.mock.calls.filter(([url]) => url === "/api/admin/products")).toHaveLength(2);
	});

	it("clears a quantity validation error when stock is corrected with an adjustment", async () => {
		const { fetchMock } = inventoryFetch();
		const user = await renderMenu(fetchMock);
		const input = quantity("Chocolate Chip");
		await user.clear(input);
		await user.type(input, "1.5");
		await user.tab();
		await screen.findByRole("alert");
		await user.click(screen.getByRole("button", { name: "Add one Chocolate Chip" }));
		await waitFor(() => expect(input.value).toBe("5"));
		expect(screen.queryByRole("alert")).toBeNull();
	});

	it("resynchronizes and shows a row error after an adjustment failure", async () => {
		const { fetchMock } = inventoryFetch({ failAdjust: true });
		const user = await renderMenu(fetchMock);

		await user.click(screen.getByRole("button", { name: "Add one Chocolate Chip" }));

		await waitFor(() => expect(quantity("Chocolate Chip").value).toBe("4"));
		expect((await screen.findByRole("alert")).textContent).toContain("Adjustment failed");
		expect(fetchMock.mock.calls.filter(([url]) => url === "/api/admin/products")).toHaveLength(2);
	});

	it("keeps a failed save visible and the field usable when refreshing stock also fails", async () => {
		const { fetchMock } = inventoryFetch({ failExact: true });
		const baseImplementation = fetchMock.getMockImplementation()!;
		let productReads = 0;
		fetchMock.mockImplementation(async (input: string | URL | Request, init?: RequestInit) => {
			if (input === "/api/admin/products" && ++productReads > 1) throw new Error("Offline");
			return baseImplementation(input, init);
		});
		const user = await renderMenu(fetchMock);
		const input = quantity("Chocolate Chip");
		await user.clear(input);
		await user.type(input, "25");
		await user.tab();
		await waitFor(() => expect(input.disabled).toBe(false));
		expect(input.value).toBe("4");
		expect((await screen.findByRole("alert")).textContent).toContain("Exact save failed");
	});

	it("serializes blur-save before an immediate plus so 12-style editing becomes exact 25 then 26", async () => {
		const gate = deferred();
		const { fetchMock } = inventoryFetch({ exactGate: gate.promise });
		const user = await renderMenu(fetchMock);
		const input = quantity("Chocolate Chip");

		await user.clear(input);
		await user.type(input, "25");
		await user.click(screen.getByRole("button", { name: "Add one Chocolate Chip" }));
		await waitFor(() => expect(mutationCalls(fetchMock, "/api/admin/inventory")).toHaveLength(1));
		expect(mutationCalls(fetchMock, "/api/admin/inventory/adjust")).toHaveLength(0);

		gate.resolve();
		await waitFor(() => expect(input.value).toBe("26"));
		expect(mutationCalls(fetchMock).map(([url]) => url)).toEqual([
			"/api/admin/inventory",
			"/api/admin/inventory/adjust",
		]);
	});

	it("does not lose rapid same-product increments", async () => {
		const { fetchMock } = inventoryFetch();
		const user = await renderMenu(fetchMock);
		const plus = screen.getByRole("button", { name: "Add one Chocolate Chip" });

		await user.click(plus);
		await user.click(plus);
		await user.click(plus);

		await waitFor(() => expect(quantity("Chocolate Chip").value).toBe("7"));
		expect(mutationCalls(fetchMock, "/api/admin/inventory/adjust")).toHaveLength(3);
	});

	it("keeps another product editable while one product is saving", async () => {
		const gate = deferred();
		const { fetchMock } = inventoryFetch({ exactGate: gate.promise });
		const user = await renderMenu(fetchMock);
		const cookie = quantity("Chocolate Chip");
		const cake = quantity("Vanilla Cake");

		await user.clear(cookie);
		await user.type(cookie, "25");
		await user.tab();
		await waitFor(() => expect(cookie.disabled).toBe(true));
		expect(cake.disabled).toBe(false);

		await user.clear(cake);
		await user.type(cake, "8");
		await user.tab();
		await waitFor(() => expect(cake.value).toBe("8"));

		gate.resolve();
		await waitFor(() => expect(cookie.value).toBe("25"));
	});
});
