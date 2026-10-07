import { publicPageMetadata } from "@/lib/seo";

export const metadata = publicPageMetadata(
	"Past Flavors",
	"Browse past Little Town Bakes cookie and bakery flavors and let the baker know which Oakley favorites you would like to see return.",
	"/request-flavor",
);

export default function PastFlavorsLayout({ children }: { children: React.ReactNode }) {
	return children;
}
