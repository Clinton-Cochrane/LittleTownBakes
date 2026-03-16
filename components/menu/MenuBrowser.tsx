"use client";

import { useEffect, useMemo, useState } from "react";
import type { MenuCatalog, Section, EnrichedItem } from "@/lib/menuCatalog";
import { buildSections, formatCurrency } from "@/lib/menuCatalog";
import MenuSection from "./MenuSection";

type MenuBrowserProps = {
	onAddToCart: (payload: {
		itemId: string;
		name: string;
		unitPrice: number;
		qty: number;
		image?: string;
		categoryId?: string;
		categoryName?: string;
		maxPerOrder?: number;
	}) => void;
	getQty: (id: string) => number;
	onSetQty: (p: {
		itemId: string;
		name: string;
		unitPrice: number;
		qty: number;
		image?: string;
		categoryId?: string;
		categoryName?: string;
		maxPerOrder?: number;
	}) => void;
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
			<div aria-busy="true" role="status" className="space-y-8 py-4">
				<div className="animate-pulse">
					<div className="mb-4 h-8 w-48 rounded bg-crust" />
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
						{[1, 2, 3, 4, 5, 6].map((i) => (
							<div key={i} className="flex gap-4 rounded-lg border border-crust bg-wheat p-4">
								<div className="h-[120px] w-[120px] shrink-0 rounded-lg bg-crust" />
								<div className="flex-1 space-y-2">
									<div className="h-5 w-3/4 rounded bg-crust" />
									<div className="h-4 w-1/2 rounded bg-crust" />
									<div className="h-9 w-24 rounded bg-crust" />
								</div>
							</div>
						))}
					</div>
				</div>
				<p className="text-center text-sm text-sage">Loading menu...</p>
			</div>
		);
	}
	if (error || !sections.length) {
		return (
			<div className="rounded-lg border border-crust bg-wheat p-8 text-center">
				<p className="font-display text-lg text-cocoa">
					{error ?? "No items available yet. Please check back later."}
				</p>
			</div>
		);
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
