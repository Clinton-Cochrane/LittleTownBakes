import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Home, { metadata } from "./page";

describe("Home route", () => {
	it("has an absolute local bakery title with the business name once", () => {
		expect(metadata.title).toEqual({ absolute: "Bakery in Oakley, CA | Little Town Bakes" });
		expect(metadata.description).toContain("cottage bakery in Oakley, California");
		expect(metadata.robots).toEqual({ index: true, follow: true });
	});

	it("renders only factual business JSON-LD, independent of About contact/pickup content", async () => {
		const html = renderToStaticMarkup(await Home());
		const json = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
		expect(json).toBeDefined();
		const business = JSON.parse(json!);
		expect(business).toMatchObject({
			"@context": "https://schema.org", "@type": "Bakery",
			name: "Little Town Bakes",
			address: { addressLocality: "Oakley", addressRegion: "CA", addressCountry: "US" },
		});
		for (const field of ["streetAddress", "postalCode", "telephone", "email", "sameAs", "order", "customer", "trackingToken"]) {
			expect(json).not.toContain(field);
		}
		for (const placeholder of ["555-0148", "instagram.com", "facebook.com", "tiktok.com", "residential", "pickupLocation"]) {
			expect(json).not.toContain(placeholder);
		}
	});
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
