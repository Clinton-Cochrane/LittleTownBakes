import { afterEach, describe, expect, it, vi } from "vitest";
import robots from "./robots";

afterEach(() => vi.unstubAllEnvs());

describe("robots.txt", () => {
	it("allows the site and excludes operational paths", () => {
		expect(robots().rules).toEqual({
			userAgent: "*", allow: "/", disallow: ["/admin/", "/checkout", "/orders/", "/api/", "/auth/"],
		});
	});

	it("advertises the sitemap only with an official HTTPS origin", () => {
		vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://bakery.example/");
		expect(robots().sitemap).toBe("https://bakery.example/sitemap.xml");
		vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
		vi.stubEnv("NODE_ENV", "production");
		expect(robots()).not.toHaveProperty("sitemap");
		vi.stubEnv("NODE_ENV", "development");
		expect(robots()).not.toHaveProperty("sitemap");
	});
});
