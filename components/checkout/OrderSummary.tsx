"use client";

import { useMemo } from "react";
import { useCart } from "@/components/cart/useCart";
import { formatCurrency } from "@/lib/menuCatalog";

export default function OrderSummary() {
	const { items } = useCart();
	const subtotal = useMemo(() => items.reduce((s, i) => s + i.price * i.qty, 0), [items]);

	if (!items.length) {
		return <p style={{ color: "#6b7280" }}>Your cart is empty.</p>;
	}

	return (
		<div>
			<h3 style={{ margin: "12px 0" }}>Order Summary</h3>
			<div style={{ display: "grid", gap: 8 }}>
				{items.map((it) => (
					<div
						key={it.id}
						style={{
							display: "grid",
							gridTemplateColumns: "1fr auto",
							gap: 8,
							padding: 8,
							border: "1px solid #e5e7eb",
							borderRadius: 10,
						}}
					>
						<div>
							<div style={{ fontWeight: 600 }}>{it.name}</div>
							<div style={{ color: "#6b7280", fontSize: 12 }}>
								{formatCurrency(it.price)} × {it.qty}
							</div>
						</div>
						<div style={{ textAlign: "right", fontWeight: 600 }}>{formatCurrency(it.price * it.qty)}</div>
					</div>
				))}
			</div>

			<div style={{ marginTop: 12, display: "flex", justifyContent: "space-between" }}>
				<span style={{ color: "#6b7280" }}>Subtotal</span>
				<span>{formatCurrency(subtotal)}</span>
			</div>
			<div style={{ marginTop: 4, display: "flex", justifyContent: "space-between" }}>
				<span style={{ color: "#6b7280" }}>Tax</span>
				<span style={{ color: "#6b7280" }}>Calculated at pickup</span>
			</div>
			<div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
				<span>Total</span>
				<span>{formatCurrency(subtotal)}</span>
			</div>
		</div>
	);
}
