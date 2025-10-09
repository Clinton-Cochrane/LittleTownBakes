import type { Item } from "@/lib/menuCatalog";

type Props = {
	item: Item;
	available: boolean;
	formatCurrency: (n: number) => string;
	qty: number;
	maxPerOrder: number;
	onAdd: () => void;
	onSetQty: (qty: number) => void;
};

export default function MenuCard({ item, available, formatCurrency, qty, maxPerOrder, onAdd, onSetQty }: Props) {
	const canInc = qty < maxPerOrder;
	const canDec = qty > 0;

	return (
		<article
			aria-label={item.name}
			style={{
				border: "1px solid #e5e7eb",
				borderRadius: 12,
				padding: 16,
				display: "flex",
				gap: 12,
				alignItems: "flex-start",
				minHeight: 120,
			}}
		>
			<div
				style={{
					width: 96,
					height: 96,
					borderRadius: 8,
					background: "'#f3f4f6",
					overflow: "hidden",
					flexShrink: 0,
				}}
				aria-hidden
			>
				{item.image ? (
					//eslint-disable-next-line @next/next/no-img-element
					<img src={item.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
				) : null}
			</div>

			<div style={{ flex: 1 }}>
				<header style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
					<h3 style={{ margin: 0, fontSize: 16, lineHeight: "20px" }}>{item.name}</h3>
					<span aria-label="price" style={{ fontWeight: 600 }}>
						{formatCurrency(item.basePrice)}
					</span>
				</header>

				{item.description ? (
					<p
						style={{
							marginTop: 8,
							marginBottom: 12,
							color: "#4b5563",
							display: "-webkit-box",
							WebkitLineClamp: 2,
							WebkitBoxOrient: "vertical",
							overflow: "hidden",
						}}
					>
						{item.description}
					</p>
				) : null}

				<div style={{ display: "flex", gap: 8, alignItems: "center" }}>
					{qty <= 0 ? (
						<button
							type="button"
							onClick={onAdd}
							disabled={!available}
							aria-label={available ? `Add ${item.name} to cart` : `${item.name} is sold out`}
							style={{
								padding: "8px 12px",
								borderRadius: 8,
								border: "1px solid #111827",
								background: available ? "#111827" : "#9ca3af",
								color: "white",
								cursor: available ? "pointer" : "not-allowed",
							}}
						>
							{available ? "Add To Cart" : "Sold Out"}
						</button>
					) : (
						<div aria-label={`quantity for ${item.name}`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
							<button
								type="button"
								onClick={() => onSetQty(qty - 1)}
								disabled={!canDec}
								aria-label={`Decrease ${item.name} quantity to ${qty - 1}`}
							>
								-
							</button>
							<input
								type="number"
								value={qty}
								min={0}
								max={maxPerOrder}
								onChange={(e) => {
									const v = Math.max(0, Math.min(maxPerOrder, Number(e.target.value) || 0));
									onSetQty(v);
								}}
								aria-label={`Set ${item.name} quantity`}
								style={{
									width: 56,
									textAlign: "center",
									border: "1px solid #e5e7eb",
									borderRadius: 8,
									padding: "4px 8px",
								}}
							/>
							<button
								type="button"
								onClick={() => onSetQty(qty + 1)}
								disabled={!canInc}
								aria-label={`Increase ${item.name} quantity to ${qty + 1}`}
							>
								+
							</button>
						</div>
					)}

					{item.maxPerOrder ? (
						<span style={{ fontSize: 12, color: "#6b7280" }}>Max {item.maxPerOrder} per order</span>
					) : null}
				</div>
			</div>
		</article>
	);
}
