// app/menu/page.tsx
"use client";

import MenuBrowser from "@/components/menu/MenuBrowser";
import { useCart } from "@/components/cart/useCart";
import { useCallback } from "react";

type AddPayLoad = {
	itemId: string;
	name: string;
	unitPrice: number;
	qty: number;
	image?: string;
	categoryId?: string;
	categoryName?: string;
	maxPerOrder?: number;
};

export default function MenuPage() {
	const { addItem, getQty, setQty } = useCart();

	// Bridge MenuBrowser -> Cart
	const handleAddToCart = useCallback(
		(p: AddPayLoad) => {
			addItem({
				id: p.itemId,
				name: p.name,
				price: p.unitPrice,
				qty: p.qty,
				image: p.image,
				categoryId: p.categoryId,
				categoryName: p.categoryName,
				maxPerOrder: p.maxPerOrder,
			});
		},
		[addItem]
	);

	const handleSetQty = useCallback(
		(p: AddPayLoad) => {
			if (getQty(p.itemId) === 0 && p.qty > 0) {
				addItem({
					id: p.itemId,
					name: p.name,
					price: p.unitPrice,
					qty: p.qty,
					image: p.image,
					categoryId: p.categoryId,
					categoryName: p.categoryName,
					maxPerOrder: p.maxPerOrder,
				});
			} else {
				setQty(p.itemId, p.qty);
			}
		},
		[addItem, getQty, setQty]
	);

	return (
		<div className="w-full">
			<MenuBrowser onAddToCart={handleAddToCart} getQty={getQty} onSetQty={handleSetQty} />
		</div>
	);
}
