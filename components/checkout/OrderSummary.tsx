"use client";

import { useMemo } from "react";
import { useCart } from "@/components/cart/useCart";
import { formatCurrency } from "@/lib/menuCatalog";

export default function OrderSummary() {
	const { items } = useCart();
	const subtotal = useMemo(() => items.reduce((s, i) => s + i.price * i.qty, 0), [items]);

	if (!items.length) {
		return <p className="text-sage">Your cart is empty.</p>;
	}

	return (
		<div>
			<h3 className="mb-4 font-display text-lg font-semibold text-cocoa">Order Summary</h3>
			<div className="grid gap-2">
				{items.map((it) => (
					<div
						key={it.id}
						className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-lg border border-crust bg-wheat p-4"
					>
						<div>
							<div className="font-semibold text-cocoa">{it.name}</div>
							<div className="text-xs text-sage">
								{formatCurrency(it.price)} × {it.qty}
							</div>
						</div>
						<div className="text-right font-semibold text-cocoa">{formatCurrency(it.price * it.qty)}</div>
					</div>
				))}
			</div>

			<div className="mt-4 flex justify-between">
				<span className="text-sage">Subtotal</span>
				<span className="text-cocoa">{formatCurrency(subtotal)}</span>
			</div>
			<div className="mt-2 flex justify-between">
				<span className="text-sage">Tax</span>
				<span className="text-sage">Calculated at pickup</span>
			</div>
			<div className="mt-4 flex justify-between font-bold text-cocoa">
				<span>Total</span>
				<span>{formatCurrency(subtotal)}</span>
			</div>
		</div>
	);
}
