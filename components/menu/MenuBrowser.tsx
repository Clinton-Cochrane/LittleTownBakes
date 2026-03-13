"use client";

import { useEffect, useMemo, useState } from "react";
import type { MenuCatalog, Section, EnrichedItem } from "@/lib/menuCatalog";
import { buildSections, formatCurrency } from "@/lib/menuCatalog";
import MenuSection from "./MenuSection";

type MenuBrowserProps = {
	onAddToCart: (payload: { itemId: string; name: string; unitPrice: number; qty: number,image?:string, categoryId?: string, categoryName?: string, maxPerOrder?: number }) => void;
	getQty: (id:string) => number;
	onSetQty: (p:{itemId:string; name:string; unitPrice: number; qty: number}) => void;
};

function isItemAvailable(item: EnrichedItem): boolean {
	return (item as EnrichedItem).available ?? item.availability.inStock;
}

export default function MenuBrowser({ onAddToCart, getQty, onSetQty }: MenuBrowserProps) {
	const [catalog, setCatalog] = useState<MenuCatalog>({ categories: [], items: [] });
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let alive = true;
		(async () => {
			setLoading(true);
			setError(null);
			const res = await fetch("/api/menu", { cache: "no-store" });
			const data = await res.json();
			if (!alive) return;
			if (!res.ok || (!data.categories?.length && !data.items?.length)) {
				setError("Menu is currently unavailable");
			} else {
				setCatalog(data);
			}
			setLoading(false);
		})();
		return () => {
			alive = false;
		};
	}, []);

	const sections: Section[] = useMemo(() => buildSections(catalog), [catalog]);

	if (loading) {
		return (
			<div aria-busy="true" role="status" style={{ padding: 16 }}>
				Loading Menu...
			</div>
		);
	}
	if (error || !sections.length) {
		return <div style={{ padding: 16 }}>{error ?? "No Items Available Yet. Please Check Back Later"}</div>;
	}

	return (
		<div>
			{sections.map((sec) => (
				<MenuSection
					key={sec.category.id}
					section={sec}
					isItemAvailable={isItemAvailable}
					formatCurrency={formatCurrency}
					onAddToCart={onAddToCart}
					getQty={getQty}
					onSetQty={onSetQty}
				/>
			))}
		</div>
	);
}
