"use client";

import { useMemo } from "react";
import { useCart } from "./useCart";
import { formatCurrency } from "@/lib/menuCatalog";
import TrashIcon from "@/components/icons/TrashIcon";

type Props = { itemId: string; onRemove: () => void };

export default function CartLine({ itemId, onRemove }: Props) {
	const { items, getQty, setQty } = useCart();
	const item = items.find((i) => i.id === itemId);
	const qty = item ? getQty(itemId) : 0;
	const max = item?.maxPerOrder ?? 99;
	const canInc = qty < max;
	const canDec = qty > 0;
	const lineTotal = useMemo(() => (item ? item.price * qty : 0), [item, qty]);

	if (!item) return null;

	return (
		<article
			className="flex gap-4 rounded-lg border border-crust bg-wheat p-4"
			aria-label={`${item.name} line`}
		>
			<div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-cream sm:h-16 sm:w-16" aria-hidden>
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

			<div className="min-w-0 flex-1">
				<div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
					<strong className="text-cocoa">{item.name}</strong>
					<span className="text-sm text-sage shrink-0">{formatCurrency(item.price)} ea</span>
				</div>

				<div className="mt-2 flex flex-wrap items-center gap-2">
					<button
						type="button"
						onClick={() => setQty(itemId, qty - 1)}
						disabled={!canDec}
						aria-label={`Decrease ${item.name} to ${qty - 1}`}
						className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-crust bg-cream text-cocoa transition-colors hover:border-honey disabled:cursor-not-allowed disabled:opacity-50"
					>
						−
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
						className="input-base w-12 shrink-0 py-1 text-center text-sm"
					/>
					<button
						type="button"
						onClick={() => setQty(itemId, qty + 1)}
						disabled={!canInc}
						aria-label={`Increase ${item.name} to ${qty + 1}`}
						className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-crust bg-cream text-cocoa transition-colors hover:border-honey disabled:cursor-not-allowed disabled:opacity-50"
					>
						+
					</button>
					<button
						type="button"
						onClick={onRemove}
						aria-label={`Remove ${item.name} from cart`}
						className="ml-auto flex shrink-0 items-center gap-1 rounded-lg border border-crust bg-cream px-2 py-1.5 text-berry transition-colors hover:bg-berry/10"
					>
						<TrashIcon size={14} />
						<span className="text-xs">Remove</span>
					</button>
				</div>

				<div className="mt-2 flex justify-end">
					<span className="font-semibold text-cocoa">{formatCurrency(lineTotal)}</span>
				</div>
			</div>
		</article>
	);
}
