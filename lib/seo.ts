import type { Metadata } from "next";
import { BRAND } from "./brand";

export const SITE = {
	name: BRAND.name,
	description: "Little Town Bakes is a cottage bakery in Oakley, California offering fresh cookies and small-batch baked goods for local pickup.",
	locality: "Oakley",
	region: "CA",
	country: "US",
	serviceArea: "East Contra Costa County",
} as const;

const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]"];

// Never infer the official domain from a deployment provider's hostname.
export function getSiteOrigin(): URL | undefined {
	const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
	if (!configured) {
		return process.env.NODE_ENV === "production" ? undefined : new URL("http://localhost:3000");
	}

	const error = "NEXT_PUBLIC_SITE_URL must be an HTTPS origin without credentials, a path, query, or fragment (HTTP localhost is allowed in development).";
	let url: URL;
	try {
		url = new URL(configured);
	} catch {
		throw new Error(error);
	}
	const local = LOCAL_HOSTS.includes(url.hostname);
	const localDevelopment = local && process.env.NODE_ENV !== "production";
	if ((url.protocol !== "https:" && !(localDevelopment && url.protocol === "http:"))
		|| (local && !localDevelopment)
		|| url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
		throw new Error(error);
	}
	return new URL(url.origin);
}

export function siteUrl(path: `/${string}`): string | undefined {
	const origin = getSiteOrigin();
	if (!origin) return undefined;
	// Match Next's canonical formatting with the default trailingSlash: false.
	return path === "/" ? origin.origin : new URL(path, origin).href;
}

export function hasOfficialSiteOrigin(): boolean {
	const origin = getSiteOrigin();
	return origin?.protocol === "https:" && !LOCAL_HOSTS.includes(origin.hostname);
}

export function publicPageMetadata(title: string, description: string, path: `/${string}`): Metadata {
	const url = siteUrl(path);
	return {
		title,
		description,
		...(url ? { alternates: { canonical: url } } : {}),
		robots: { index: true, follow: true },
		openGraph: {
			type: "website",
			locale: "en_US",
			siteName: SITE.name,
			title: `${title} | ${SITE.name}`,
			description,
			...(url ? { url } : {}),
		},
	};
}

export function getBakeryStructuredData() {
	return {
		"@context": "https://schema.org",
		"@type": "Bakery",
		name: SITE.name,
		description: SITE.description,
		address: {
			"@type": "PostalAddress",
			addressLocality: SITE.locality,
			addressRegion: SITE.region,
			addressCountry: SITE.country,
		},
		areaServed: [SITE.locality, SITE.serviceArea],
		...(hasOfficialSiteOrigin() ? { url: siteUrl("/") } : {}),
		// Add logo via siteUrl(BRAND.logo.src) once the approved asset is delivered.
		// Contact/social fields require confirmed production values, never about.json.
	};
}

export function serializeJsonLd(value: unknown): string {
	return JSON.stringify(value).replace(/</g, "\\u003c");
}
