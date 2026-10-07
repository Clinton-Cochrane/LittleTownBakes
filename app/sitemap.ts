import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
	return (["/", "/menu", "/request-flavor"] as const).flatMap((path) => {
		const url = siteUrl(path);
		return url ? [{ url }] : [];
	});
}
