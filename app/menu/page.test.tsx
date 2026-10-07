import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/pages/MenuPage", () => ({
	default: () => <div>existing-full-menu</div>,
}));

import MenuRoute, { metadata } from "./page";

describe("Menu route", () => {
	it("has indexable menu metadata without a repeated business name", () => {
		expect(metadata.title).toBe("Cookies & Bakery Menu");
		expect(metadata.description).toContain("pickup in Oakley, California");
		expect(metadata.robots).toEqual({ index: true, follow: true });
		expect(metadata.openGraph).not.toHaveProperty("images");
	});
	it("renders the existing full customer menu", () => {
		expect(renderToStaticMarkup(<MenuRoute />)).toContain("existing-full-menu");
	});
});
