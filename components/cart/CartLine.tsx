"use client";

import { useMemo } from "react";
import { useCart } from "./useCart";
import { formatCurrency } from "@/lib/menuCatalog";

type Props = { itemId: string; onRemove: () => void };

export default function CartLine({ itemId, onRemove }: Props) {
	const { items, getQty, setQty } = useCart();
	const item = items.find((i) => i.id === itemId);
	if (!item) return null;

	const qty = getQty(itemId);
	const max = item.maxPerOrder ?? 99;
	const canInc = qty < max;
	const canDec = qty > 0;
	// eslint-disable-next-line react-hooks/rules-of-hooks
	const lineTotal = useMemo(() => item.price * qty, [item.price, qty]);

	return (
		<article
			style={{
				display: "grid",
				gridTemplateColumns: "64px 1fr auto",
				gap: 12,
				alignItems: "center",
				padding: 8,
				border: "1px solid #e5e7eb",
				borderRadius: 10,
			}}
			aria-label={`${item.name} line`}
		>
			{/*thumbnail */}
			<div style={{ width: 64, height: 64, borderRadius: 8, background: "#f3f4f6", overflow: "hidden" }} aria-hidden>
				{item.image ? (
					// eslint-disable-next-line @next/next/no-img-element
					<img src={item.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
				) : null}
			</div>

			{/*title, unit, stepper */}
			<div style={{ display: "grid", gap: 6 }}>
				<div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
					<strong>{item.name}</strong>
					<span style={{ color: "#6b7280" }}> {formatCurrency(item.price)} ea</span>
				</div>

				<div style={{ display: "flex", gap: 8, alignItems: "center" }}>
					<button
						type="button"
						onClick={() => setQty(itemId, qty - 1)}
						disabled={!canDec}
						aria-label={`Decrease ${item.name} to ${qty - 1}`}
						style={{
							width: 32,
							height: 32,
							borderRadius: 8,
							border: "1px solid #e5e7eb",
							background: "#fff",
							cursor: canDec ? "pointer" : "not-allowed",
						}}
					>
						-
					</button>

					<input
						type="number"
						value={qty}
						min={0}
						max={max}
						onChange={(e) => {
							const v = Math.max(0, Math.min(max, Number(e.target.value) || 0));
							setQty(itemId, v);
						}}
						aria-label={`Set ${item.name} quantity`}
						style={{ width: 56, textAlign: "center", border: "1px solid #e5e7eb", borderRadius: 8, padding: "4px 8px" }}
					/>

					<button
						type="button"
						onClick={() => setQty(itemId, qty + 1)}
						disabled={!canInc}
						aria-label={`Increase ${item.name} to ${qty + 1}`}
						style={{
							width: 32,
							height: 32,
							borderRadius: 8,
							border: "1px solid #e5e7eb",
							background: "fff",
							cursor: canInc ? "pointer" : "not-allowed",
						}}
					>
						+
					</button>

					<button
						type="button"
						onClick={onRemove}
						aria-label={`Remove ${item.name} from cart`}
						style={{
							marginLeft: "auto",
							border: "1px solid #e5e7eb",
							background: "#fff",
							color: "#b91c1c",
							borderRadius: 8,
							padding: "6px 10px",
							cursor: "pointer",
						}}
					>
						🗑️
					</button>
				</div>
			</div>
			{/* line total */}
			<div style={{ textAlign: "right", fontWeight: 600 }}>{formatCurrency(lineTotal)}</div>
		</article>
	);
}
