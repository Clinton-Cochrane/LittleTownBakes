// app/menu/page.tsx
"use client";

import MenuBrowser from "@/components/menu/MenuBrowser";
import { useCart } from "@/components/cart/useCart";
import { useCallback } from "react";

export default function MenuPage() {
	const { addItem, getQty, setQty } = useCart();

	// Bridge MenuBrowser -> Cart
	const handleAddToCart = useCallback(
		(p: { itemId: string; name: string; unitPrice: number; qty: number }) => {
			addItem({ id: p.itemId, name: p.name, price: p.unitPrice, qty: p.qty });
		},
		[addItem]
	);

	const handleSetQty = useCallback(
		(p: { itemId: string; name: string; unitPrice: number; qty: number }) => {
			if (getQty(p.itemId) === 0 && p.qty > 0) {
				addItem({ id: p.itemId, name: p.name, price: p.unitPrice, qty: p.qty });
			} else {
				setQty(p.itemId, p.qty);
			}
		},
		[addItem, getQty, setQty]
	);

	return (
		<main className="mx-auto max-w-4xl px-4 py-6">
			<MenuBrowser onAddToCart={handleAddToCart} getQty={getQty} onSetQty={handleSetQty} />
		</main>
	);
}
