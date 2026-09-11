// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminMenuProduct } from "@/lib/adminMenu";
import { AdminMenu } from "./AdminMenu";

function product(quantityOnHand: number): AdminMenuProduct {
	return {
		id: "chocolate-cake",
		categoryId: "cakes",
		name: "Chocolate Cake",
		description: "Rich chocolate cake",
		priceCents: 350,
		image: null,
		maxPerOrder: 6,
		isArchived: false,
		sortOrder: 10,
		quantityOnHand,
		soldCount: 82,
		demandCount: 31,
		currentDemandCount: 4,
	};
}

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

function mockMenuRequests(quantityOnHand: number) {
	return vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
		const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
		if (url === "/api/admin/products" && !init?.method) return jsonResponse([product(quantityOnHand)]);
		if (url === "/api/admin/categories" && !init?.method) return jsonResponse([{ id: "cakes", name: "Cakes", sortOrder: 10 }]);
		if (url === "/api/admin/inventory/adjust" && init?.method === "POST") {
			return jsonResponse({ product_id: "chocolate-cake", quantity_on_hand: quantityOnHand + 12 });
		}
		throw new Error(`Unexpected fetch: ${init?.method ?? "GET"} ${url}`);
	});
}

async function openRefill(user: ReturnType<typeof userEvent.setup>) {
	await screen.findByRole("heading", { name: "Chocolate Cake" });
	await user.click(screen.getByRole("button", { name: "Refill" }));
	return screen.getByRole("textbox", { name: "Refill amount for Chocolate Cake" });
}

describe("AdminMenu refill interaction", () => {
	beforeEach(() => {
		window.history.replaceState(null, "", "/admin/menu");
	});

	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
	});

	it.each([
		{ startingQuantity: 0, resultingQuantity: 12 },
		{ startingQuantity: 5, resultingQuantity: 17 },
	])("adds 12 to stock $startingQuantity and displays authoritative stock $resultingQuantity", async ({ startingQuantity, resultingQuantity }) => {
		const fetchMock = mockMenuRequests(startingQuantity);
		vi.stubGlobal("fetch", fetchMock);
		const user = userEvent.setup();
		render(<AdminMenu />);

		const input = await openRefill(user);
		await user.type(input, "12");
		await user.click(screen.getByRole("button", { name: "Confirm" }));

		await screen.findByText(`${resultingQuantity} available`);
		const adjustment = fetchMock.mock.calls.find(([url, init]) => url === "/api/admin/inventory/adjust" && init?.method === "POST");
		expect(adjustment).toBeDefined();
		expect(JSON.parse(String(adjustment?.[1]?.body))).toEqual({ product_id: "chocolate-cake", delta: 12 });
		expect(fetchMock.mock.calls.filter(([url]) => url === "/api/admin/inventory/adjust")).toHaveLength(1);
	});

	it("submits the value present in the form when input state has not committed yet", async () => {
		const fetchMock = mockMenuRequests(0);
		vi.stubGlobal("fetch", fetchMock);
		const user = userEvent.setup();
		render(<AdminMenu />);

		const input = await openRefill(user) as HTMLInputElement;
		input.value = "12";
		await user.click(screen.getByRole("button", { name: "Confirm" }));

		await screen.findByText("12 available");
		const adjustment = fetchMock.mock.calls.find(([url]) => url === "/api/admin/inventory/adjust");
		expect(JSON.parse(String(adjustment?.[1]?.body))).toEqual({ product_id: "chocolate-cake", delta: 12 });
	});

	it.each(["", "-1", "1.5", "twelve", "2147483648"])("rejects invalid refill %j without mutating", async (value) => {
		const fetchMock = mockMenuRequests(5);
		vi.stubGlobal("fetch", fetchMock);
		const user = userEvent.setup();
		render(<AdminMenu />);

		const input = await openRefill(user);
		if (value) await user.type(input, value);
		await user.click(screen.getByRole("button", { name: "Confirm" }));

		expect((await screen.findByRole("alert")).textContent).toBe("Enter a whole number, 0 or more.");
		expect(fetchMock.mock.calls.filter(([url]) => url === "/api/admin/inventory/adjust")).toHaveLength(0);
	});

	it("prevents a duplicate refill while the first request is in flight", async () => {
		let finishAdjustment: ((response: Response) => void) | undefined;
		const adjustmentResponse = new Promise<Response>((resolve) => {
			finishAdjustment = resolve;
		});
		const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
			const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
			if (url === "/api/admin/products" && !init?.method) return jsonResponse([product(5)]);
			if (url === "/api/admin/categories" && !init?.method) return jsonResponse([{ id: "cakes", name: "Cakes", sortOrder: 10 }]);
			if (url === "/api/admin/inventory/adjust" && init?.method === "POST") return adjustmentResponse;
			throw new Error(`Unexpected fetch: ${init?.method ?? "GET"} ${url}`);
		});
		vi.stubGlobal("fetch", fetchMock);
		const user = userEvent.setup();
		render(<AdminMenu />);

		const input = await openRefill(user);
		await user.type(input, "12");
		const confirm = screen.getByRole("button", { name: "Confirm" });
		await user.click(confirm);
		expect((await screen.findByRole("button", { name: "Refilling…" }) as HTMLButtonElement).disabled).toBe(true);
		await user.click(screen.getByRole("button", { name: "Refilling…" }));
		expect(fetchMock.mock.calls.filter(([url]) => url === "/api/admin/inventory/adjust")).toHaveLength(1);

		finishAdjustment?.(jsonResponse({ product_id: "chocolate-cake", quantity_on_hand: 17 }));
		await waitFor(() => expect(screen.getByText("17 available")).toBeTruthy());
	});
});
