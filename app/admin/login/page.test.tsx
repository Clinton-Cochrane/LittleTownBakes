import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminLogin from "./page";

describe("admin login page", () => {
	afterEach(() => vi.unstubAllEnvs());

	it("renders only the public login experience without the authenticated shell", async () => {
		vi.stubEnv("NODE_ENV", "development");
		vi.stubEnv("LOCAL_DATA_SOURCE", "json");
		const html = renderToStaticMarkup(await AdminLogin({ searchParams: Promise.resolve({}) }));

		expect(html).toContain("Admin Login");
		expect(html).toContain("root@local.test");
		expect(html).not.toContain("Orders");
		expect(html).not.toContain("Past Flavors");
		expect(html).not.toContain("Logout");
	});
});
