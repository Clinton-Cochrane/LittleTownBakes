import { afterEach, describe, expect, it, vi } from "vitest";
import sitemap from "./sitemap";

afterEach(() => vi.unstubAllEnvs());

describe("sitemap.xml", () => {
	it("contains exactly the three deliberate landing pages", () => {
		vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://bakery.example");
		expect(sitemap()).toEqual([
			{ url: "https://bakery.example" },
			{ url: "https://bakery.example/menu" },
			{ url: "https://bakery.example/request-flavor" },
		]);
	});

	it("uses localhost for development and no invented production URLs", () => {
		vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
		vi.stubEnv("NODE_ENV", "development");
		expect(sitemap().map((entry) => entry.url)).toEqual([
			"http://localhost:3000", "http://localhost:3000/menu", "http://localhost:3000/request-flavor",
		]);
		vi.stubEnv("NODE_ENV", "production");
		expect(sitemap()).toEqual([]);
	});
});
