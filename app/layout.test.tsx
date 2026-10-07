import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
	DM_Sans: () => ({ variable: "font-body" }),
	Fraunces: () => ({ variable: "font-display" }),
}));

afterEach(() => vi.unstubAllEnvs());

async function loadMetadata() {
	vi.resetModules();
	return (await import("./layout")).metadata;
}

describe("site metadata", () => {
	it("uses the launch identity, local description, and existing cookie favicon", async () => {
		const metadata = await loadMetadata();
		expect(metadata.title).toEqual({
			default: "Little Town Bakes",
			template: "%s | Little Town Bakes",
		});
		expect(metadata.description).toContain("cottage bakery in Oakley, California");
		expect(metadata.description).toContain("cookies and small-batch baked goods");
		expect(metadata.icons).toEqual({ icon: "/brand/favicon.svg" });
		expect(metadata.applicationName).toBe("Little Town Bakes");
		expect(metadata.robots).toEqual({ index: true, follow: true });
		expect(metadata.openGraph).toMatchObject({
			siteName: "Little Town Bakes", type: "website", locale: "en_US",
		});
		expect(metadata.openGraph).not.toHaveProperty("images");
		expect(metadata.alternates?.canonical).toBeUndefined();
	});

	it("sets the metadata base to the configured origin", async () => {
		vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://bakery.example/");
		expect((await loadMetadata()).metadataBase?.href).toBe("https://bakery.example/");
	});

	it("does not choose a temporary hostname in production without an official origin", async () => {
		vi.stubEnv("NODE_ENV", "production");
		vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
		vi.stubEnv("VERCEL_URL", "temporary.vercel.app");
		expect((await loadMetadata()).metadataBase).toBeUndefined();
	});

	it("uses localhost for local metadata", async () => {
		vi.stubEnv("NODE_ENV", "development");
		vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
		expect((await loadMetadata()).metadataBase?.href).toBe("http://localhost:3000/");
	});
});
