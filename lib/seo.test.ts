import { afterEach, describe, expect, it, vi } from "vitest";
import { getBakeryStructuredData, getSiteOrigin, hasOfficialSiteOrigin, publicPageMetadata, serializeJsonLd, siteUrl } from "./seo";

afterEach(() => vi.unstubAllEnvs());

describe("site origin and public metadata", () => {
	it("builds all URLs from the configured origin", () => {
		vi.stubEnv("NEXT_PUBLIC_SITE_URL", " https://bakery.example/ ");
		expect(getSiteOrigin()?.origin).toBe("https://bakery.example");
		expect(siteUrl("/menu")).toBe("https://bakery.example/menu");
		expect(siteUrl("/")).toBe("https://bakery.example");
		expect(hasOfficialSiteOrigin()).toBe(true);
	});

	it("falls back locally but emits no invented production origin", () => {
		vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
		vi.stubEnv("NODE_ENV", "development");
		expect(siteUrl("/")).toBe("http://localhost:3000");
		expect(hasOfficialSiteOrigin()).toBe(false);
		vi.stubEnv("NODE_ENV", "production");
		vi.stubEnv("VERCEL_URL", "temporary.vercel.app");
		vi.stubEnv("RENDER_EXTERNAL_URL", "https://temporary.onrender.com");
		expect(getSiteOrigin()).toBeUndefined();
		expect(siteUrl("/menu")).toBeUndefined();
		expect(publicPageMetadata("Menu", "Menu description", "/menu").alternates).toBeUndefined();
	});

	it.each([
		"not-a-url", "ftp://bakery.example", "https://bakery.example/path",
		"https://bakery.example/?query=1", "https://bakery.example/#fragment",
		"https://user:password@bakery.example", "http://bakery.example",
	])("rejects an invalid site origin: %s", (value) => {
		vi.stubEnv("NEXT_PUBLIC_SITE_URL", value);
		expect(() => getSiteOrigin()).toThrow(/NEXT_PUBLIC_SITE_URL/);
	});

	it("allows explicit localhost for development only", () => {
		vi.stubEnv("NODE_ENV", "development");
		vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3001");
		expect(siteUrl("/menu")).toBe("http://localhost:3001/menu");
		expect(hasOfficialSiteOrigin()).toBe(false);
		vi.stubEnv("NODE_ENV", "production");
		expect(() => getSiteOrigin()).toThrow(/NEXT_PUBLIC_SITE_URL/);
	});
});

describe("Bakery JSON-LD", () => {
	it("uses a fixed business-only allowlist and locality-level address", () => {
		vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
		vi.stubEnv("NODE_ENV", "production");
		const business = getBakeryStructuredData();
		expect(Object.keys(business).sort()).toEqual(["@context", "@type", "address", "areaServed", "description", "name"].sort());
		expect(business.address).toEqual({
			"@type": "PostalAddress", addressLocality: "Oakley", addressRegion: "CA", addressCountry: "US",
		});
	});

	it("adds only the explicitly configured official URL and no missing logo", () => {
		vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://bakery.example");
		expect(getBakeryStructuredData()).toHaveProperty("url", "https://bakery.example");
		expect(getBakeryStructuredData()).not.toHaveProperty("logo");
	});

	it("does not claim localhost as the business URL", () => {
		vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
		vi.stubEnv("NODE_ENV", "development");
		expect(getBakeryStructuredData()).not.toHaveProperty("url");
	});

	it("escapes script termination without changing the JSON payload", () => {
		const payload = { name: "</script><script>alert('test')</script>" };
		const json = serializeJsonLd(payload);
		expect(json).not.toContain("<");
		expect(JSON.parse(json)).toEqual(payload);
	});
});
