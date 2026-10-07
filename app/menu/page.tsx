import MenuPage from "@/components/pages/MenuPage";
import { publicPageMetadata } from "@/lib/seo";

export const metadata = publicPageMetadata(
	"Cookies & Bakery Menu",
	"Browse the current Little Town Bakes menu of fresh cookies and small-batch baked goods available for pickup in Oakley, California.",
	"/menu",
);

export default function MenuRoute() {
	return <MenuPage />;
}
