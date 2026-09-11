import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/pages/MenuPage", () => ({
	default: () => <div>existing-full-menu</div>,
}));

import MenuRoute from "./page";

describe("Menu route", () => {
	it("renders the existing full customer menu", () => {
		expect(renderToStaticMarkup(<MenuRoute />)).toContain("existing-full-menu");
	});
});
