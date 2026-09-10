import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ArchivedFlavorCard } from "@/components/menu/ArchivedFlavorCard";
import RequestFlavorPage from "./page";

describe("Past Flavors page", () => {
	it("does not collect contact details or promise notifications", () => {
		const html = renderToStaticMarkup(createElement(RequestFlavorPage));
		expect(html).not.toContain('type="email"');
		expect(html).not.toContain("Your name");
		expect(html).not.toContain("Notes");
		expect(html).not.toContain("notify");
		expect(html).not.toContain("let you know");
	});

	it("offers the anonymous archived-product demand action", () => {
		const html = renderToStaticMarkup(createElement(ArchivedFlavorCard, {
			item: { id: "cake", name: "Chocolate Cake" },
		}));
		expect(html).toContain("Bring this back");
		expect(html).not.toContain("email");
		expect(html).not.toContain("name");
		expect(html).not.toContain("notes");
	});
});
