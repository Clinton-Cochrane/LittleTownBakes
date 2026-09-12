// @vitest-environment jsdom
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminOrders from "./admin/(authenticated)/orders/page";
import OrderDetails from "@/components/orders/OrderDetails";
import type { AdminOrderRecord, PublicOrderTracking } from "@/lib/orderTypes";

vi.mock("next/navigation", () => ({ useParams: vi.fn() }));

const publicOrder: PublicOrderTracking = {
	publicOrderNumber: 1042,
	fulfillmentStatus: "RECEIVED",
	payment: { method: "cash", status: "PENDING" },
	items: [{ productId: "cake", name: "Issue 42 Smoke Test", unitPriceCents: 2500, quantity: 1, lineTotalCents: 2500 }],
	totals: { subtotalCents: 2500, totalCents: 2500 },
};

describe("human-facing order numbers", () => {
	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
	});

	it("renders the public number on the customer order page", () => {
		const html = renderToStaticMarkup(createElement(OrderDetails, { order: publicOrder }));
		expect(html).toContain("Order #1042");
		expect(html).not.toContain("ord_internal");
	});

	it("renders the public number instead of the internal ID on the admin page", async () => {
		const order: AdminOrderRecord = {
			...publicOrder,
			id: "ord_internal",
			trackingToken: null,
			createdAt: "2026-09-11T20:00:00.000Z",
			customer: { name: "Issue 42 Smoke Test", email: "test@example.com" },
		};
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [order] }));
		render(createElement(AdminOrders));
		expect(await screen.findByText("Order #1042")).toBeTruthy();
		expect(screen.getByText("Issue 42 Smoke Test")).toBeTruthy();
		expect(document.body.textContent).not.toContain("ord_internal");
	});
});
