"use client";

import { useState } from "react";
import { parseRefillAmount, type AdminMenuProduct } from "@/lib/adminMenu";

type MenuProductCardProps = {
	product: AdminMenuProduct;
	pending?: number;
	error?: string;
	onAdjust: (delta: number) => void;
	onEdit: () => void;
	onArchive: () => void;
};

export function MenuProductCard({ product, pending = 0, error, onAdjust, onEdit, onArchive }: MenuProductCardProps) {
	const [refilling, setRefilling] = useState(false);
	const [amount, setAmount] = useState("");
	const [refillError, setRefillError] = useState<string | null>(null);
	const soldOut = product.quantityOnHand === 0;

	function submitRefill(event: React.FormEvent) {
		event.preventDefault();
		const parsed = parseRefillAmount(amount);
		if (parsed === null) {
			setRefillError("Enter a whole number, 0 or more.");
			return;
		}
		setRefillError(null);
		onAdjust(parsed);
		setAmount("");
		setRefilling(false);
	}

	return (
		<article className="card-warm p-4 sm:p-5">
			<div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
				<div className="min-w-0 flex-1">
					<h2 className="break-words font-display text-lg font-semibold text-cocoa">{product.name}</h2>
					<p className={`mt-1 text-sm font-semibold ${soldOut ? "text-berry" : "text-success"}`}>{soldOut ? "Sold Out · 0 available" : `${product.quantityOnHand} available`}</p>
					<p className="mt-1 text-xs text-sage">{product.soldCount} sold · {product.demandCount} demand signals</p>
					{pending > 0 && <p className="mt-1 text-xs text-sage" role="status">Updating {pending === 1 ? "change" : `${pending} changes`}…</p>}
				</div>
				<div className="flex items-center justify-between gap-2 sm:justify-end">
					<div className="flex items-center gap-2" aria-label={`Change quantity for ${product.name}`}>
						<button type="button" onClick={() => onAdjust(-1)} disabled={soldOut} className="flex h-12 w-12 items-center justify-center rounded-button border border-caramel bg-cream text-2xl font-semibold text-caramel disabled:opacity-40" aria-label={`Remove one ${product.name}`}>−</button>
						<strong className="w-10 text-center text-xl tabular-nums" aria-live="polite">{product.quantityOnHand}</strong>
						<button type="button" onClick={() => onAdjust(1)} className="flex h-12 w-12 items-center justify-center rounded-button border border-caramel bg-honey text-2xl font-semibold text-white" aria-label={`Add one ${product.name}`}>+</button>
					</div>
					<button type="button" className="min-h-12 rounded-button px-3 font-semibold text-caramel underline decoration-caramel/40 underline-offset-4" onClick={onEdit}>Edit</button>
				</div>
			</div>
			{(error || refillError) && <p className="mt-3 rounded-lg bg-berry/10 px-3 py-2 text-sm text-berry" role="alert">{error ?? refillError}</p>}
			<div className="mt-3 flex items-center gap-4 border-t border-crust pt-3 text-sm">
				<button type="button" className="min-h-11 font-semibold text-caramel underline underline-offset-4" onClick={() => setRefilling((current) => !current)}>Refill</button>
				<button type="button" className="min-h-11 text-berry underline underline-offset-4" onClick={onArchive}>Archive</button>
			</div>
			{refilling && <form className="mt-2 flex flex-wrap items-end gap-2" onSubmit={submitRefill}><label className="min-w-0 flex-1"><span className="mb-1 block text-sm font-medium">Add</span><input className="input-base" inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="12" aria-label={`Refill amount for ${product.name}`} /></label><button type="submit" className="btn-primary">Confirm</button></form>}
		</article>
	);
}

export function PastFlavorCard({ product, error, onEdit, onRestore }: { product: AdminMenuProduct; error?: string; onEdit: () => void; onRestore: () => void }) {
	return (
		<article className="card-warm p-4 sm:p-5">
			<h2 className="break-words font-display text-lg font-semibold text-cocoa">{product.name}</h2>
			{product.description && <p className="mt-1 text-sm text-sage">{product.description}</p>}
			<p className="mt-2 text-xs text-sage">{product.soldCount} sold · {product.demandCount} demand signals</p>
			{error && <p className="mt-3 rounded-lg bg-berry/10 px-3 py-2 text-sm text-berry" role="alert">{error}</p>}
			<div className="mt-4 flex gap-3"><button type="button" className="btn-secondary min-h-11" onClick={onEdit}>Edit</button><button type="button" className="btn-primary" onClick={onRestore}>Restore</button></div>
		</article>
	);
}
