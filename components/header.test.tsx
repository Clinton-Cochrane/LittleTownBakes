import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn() }),
}));

import Header from "./header";
import { CartProvider } from "./cart/useCart";

describe("public navigation", () => {
	it("links the brand and Home to /, Menu to /menu, and preserves Past flavors", () => {
		const html = renderToStaticMarkup(
			<CartProvider>
				<Header />
			</CartProvider>,
		);

		expect(html).toMatch(/href="\/"[^>]*>Hometown Cottage Bakery/);
		expect(html).toMatch(/href="\/"[^>]*>[\s\S]*?Home<\/a>/);
		expect(html).toMatch(/href="\/menu"[^>]*>[\s\S]*?Menu<\/a>/);
		expect(html).toContain('href="/request-flavor"');
	});
});
