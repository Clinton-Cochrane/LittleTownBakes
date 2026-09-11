import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("Home route", () => {
	it("renders the approved bakery story and a Menu CTA instead of the catalog", async () => {
		const html = renderToStaticMarkup(await Home());

		expect(html).toContain("Little Town Bakes");
		expect(html).toContain("Fresh from our hearth to your home.");
		expect(html).toContain("Our Story");
		expect(html).toContain("Little Town Bakes began in a home kitchen");
		expect(html).toContain('href="/menu"');
		expect(html).toContain("View Menu");
		expect(html).not.toContain("Loading menu");
	});
});
