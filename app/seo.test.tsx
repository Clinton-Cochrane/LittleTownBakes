import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import CheckoutLayout, { metadata as checkout } from "./checkout/layout";
import OrdersLayout, { metadata as orders } from "./orders/layout";
import AdminLayout, { metadata as admin } from "./admin/layout";

afterEach(() => vi.unstubAllEnvs());

describe("workflow metadata boundaries", () => {
	it.each([["checkout", checkout], ["orders", orders], ["admin", admin]])("prevents indexing and following throughout %s", (_, metadata) => {
		expect(metadata).toEqual({ robots: { index: false, follow: false } });
	});

	it.each([CheckoutLayout, OrdersLayout, AdminLayout])("preserves the child workflow", (Layout) => {
		expect(renderToStaticMarkup(<Layout><div>existing-workflow</div></Layout>)).toContain("existing-workflow");
	});
});

describe("public canonical metadata", () => {
	it("uses the shared origin for all three public landing pages", async () => {
		vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://bakery.example");
		vi.resetModules();
		const { metadata: home } = await import("./page");
		const { metadata: menu } = await import("./menu/page");
		const { metadata: flavors } = await import("./request-flavor/layout");
		for (const [metadata, path] of [[home, "/"], [menu, "/menu"], [flavors, "/request-flavor"]] as const) {
			const url = `https://bakery.example${path === "/" ? "" : path}`;
			expect(metadata.alternates?.canonical).toBe(url);
			expect(metadata.openGraph).toMatchObject({ url, siteName: "Little Town Bakes" });
			expect(metadata.robots).toEqual({ index: true, follow: true });
		}
		expect(flavors.title).toBe("Past Flavors");
		expect(flavors.description).toContain("Oakley favorites");
	});
});
