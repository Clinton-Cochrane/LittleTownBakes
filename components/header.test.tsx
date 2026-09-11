import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn() }),
	usePathname: () => "/",
}));

import Header from "./header";
import { CartProvider } from "./cart/useCart";

describe("public navigation", () => {
	it("renders the public brand, tagline, logo wiring, navigation, and cart", () => {
		const html = renderToStaticMarkup(
			<CartProvider>
				<Header />
			</CartProvider>,
		);

		expect(html).toContain("Little Town Bakes");
		expect(html).toContain("Fresh from our hearth to your home.");
		expect(html).not.toContain("Hometown Cottage Bakery");
		expect(html).toContain('src="/brand/little-town-bakes-logo.png"');
		expect(html).toContain('alt="Little Town Bakes logo"');
		expect(html).toMatch(/href="\/"[^>]*>[\s\S]*?Little Town Bakes[\s\S]*?<\/a>/);
		expect(html).toMatch(/href="\/"[^>]*>[\s\S]*?Home<\/a>/);
		expect(html).toMatch(/href="\/menu"[^>]*>[\s\S]*?Menu<\/a>/);
		expect(html).toContain('href="/request-flavor"');
		expect(html).toContain('aria-label="Open cart (0 items)"');
	});
});
