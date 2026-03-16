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
			className="flex flex-col gap-5 rounded-card border border-crust bg-wheat p-5 shadow-soft transition-shadow duration-200 hover:shadow-card sm:flex-row sm:min-h-[140px] sm:gap-6 sm:p-6"
		>
			<div className="aspect-square w-full shrink-0 overflow-hidden rounded-lg bg-cream shadow-soft sm:h-[120px] sm:w-[120px] sm:aspect-auto" aria-hidden>
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img
					src={item.image || "/img/placeholder.svg"}
					alt=""
					className="h-full w-full object-cover"
					onError={(e) => {
						(e.target as HTMLImageElement).src = "/img/placeholder.svg";
					}}
				/>
			</div>

			<div className="flex flex-1 flex-col">
				<header className="flex items-start justify-between gap-2">
					<h3 className="font-display text-lg font-semibold text-cocoa">{item.name}</h3>
					<span aria-label="price" className="font-semibold text-caramel">
						{formatCurrency(item.basePrice)}
					</span>
				</header>

				{item.description ? (
					<p className="mt-3 line-clamp-2 text-sm text-cocoa/80">{item.description}</p>
				) : null}

				<div className="mt-auto flex flex-wrap items-center gap-4 gap-y-3 pt-4">
					{qty <= 0 ? (
						<button
							type="button"
							onClick={onAdd}
							disabled={!available}
							aria-label={available ? `Add ${item.name} to cart` : `${item.name} is sold out`}
							className="btn-primary disabled:bg-sage disabled:border-sage"
						>
							{available ? "Add To Cart" : "Sold Out"}
						</button>
					) : (
						<div aria-label={`quantity for ${item.name}`} className="flex items-center gap-2">
							<button
								type="button"
								onClick={() => onSetQty(qty - 1)}
								disabled={!canDec}
								aria-label={`Decrease ${item.name} quantity to ${qty - 1}`}
								className="flex h-9 w-9 items-center justify-center rounded-lg border border-crust bg-cream text-cocoa transition-colors hover:border-honey hover:bg-wheat disabled:cursor-not-allowed disabled:opacity-50"
							>
								−
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
								className="input-base w-14 py-1.5 text-center text-sm"
							/>
							<button
								type="button"
								onClick={() => onSetQty(qty + 1)}
								disabled={!canInc}
								aria-label={`Increase ${item.name} quantity to ${qty + 1}`}
								className="flex h-9 w-9 items-center justify-center rounded-lg border border-crust bg-cream text-cocoa transition-colors hover:border-honey hover:bg-wheat disabled:cursor-not-allowed disabled:opacity-50"
							>
								+
							</button>
						</div>
					)}

					{item.maxPerOrder ? (
						<span className="text-xs text-sage">Max {item.maxPerOrder} per order</span>
					) : null}
				</div>
			</div>
		</article>
	);
}
