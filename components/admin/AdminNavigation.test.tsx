import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AdminNavigation } from "./AdminNavigation";

vi.mock("@/lib/localMode", () => ({ isLocalMode: () => false }));
vi.mock("./LogoutButton", () => ({ LogoutButton: () => null }));

describe("AdminNavigation", () => {
	it("provides one Menu Management destination on mobile and desktop", () => {
		const html = renderToStaticMarkup(createElement(AdminNavigation));
		expect(html.match(/href="\/admin\/menu"/g)).toHaveLength(2);
		expect(html.match(/Menu Management/g)).toHaveLength(2);
		expect(html).not.toContain("/admin/inventory");
	});
});
