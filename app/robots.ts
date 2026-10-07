import type { MetadataRoute } from "next";
import { hasOfficialSiteOrigin, siteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
	return {
		rules: {
			userAgent: "*",
			allow: "/",
			disallow: ["/admin/", "/checkout", "/orders/", "/api/", "/auth/"],
		},
		...(hasOfficialSiteOrigin() ? { sitemap: siteUrl("/sitemap.xml") } : {}),
	};
}
