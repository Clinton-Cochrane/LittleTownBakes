"use client";

import { useEffect, useId, useRef, useState } from "react";
import { parseRefillAmount, type AdminMenuProduct } from "@/lib/adminMenu";
import { formatCurrency } from "@/lib/menuCatalog";

type MenuProductCardProps = {
	product: AdminMenuProduct;
	pending?: number;
	error?: string;
	onSet: (quantity: number) => Promise<number | null>;
	onAdjust: (delta: number) => void | Promise<void>;
	onEdit: () => void;
	onArchive: () => void;
};

function ProductDetails({ product }: { product: AdminMenuProduct }) {
	return (
		<div className="flex flex-col gap-4 sm:flex-row">
			<div className="h-32 w-32 shrink-0 overflow-hidden rounded-lg border border-crust bg-wheat">
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img src={product.image ?? "/img/placeholder.svg"} alt={product.name} className="h-full w-full object-cover" onError={(event) => { event.currentTarget.src = "/img/placeholder.svg"; }} />
			</div>
			<div className="min-w-0 flex-1">
				{product.description && <p className="whitespace-pre-line break-words text-sm text-cocoa">{product.description}</p>}
				<p className="mt-3 text-sm text-muted">Maximum per order: {product.maxPerOrder}</p>
				<p className="mt-2 text-xs text-muted">{product.soldCount} sold · {product.demandCount} demand signals</p>
			</div>
		</div>
	);
}

export function MenuProductCard({ product, pending = 0, error, onSet, onAdjust, onEdit, onArchive }: MenuProductCardProps) {
	const [expanded, setExpanded] = useState(false);
	const detailsId = useId();
	const [quantityDraft, setQuantityDraft] = useState(String(product.quantityOnHand));
	const [quantityError, setQuantityError] = useState<string | null>(null);
	const exactRequestInFlight = useRef(false);
	const [refilling, setRefilling] = useState(false);
	const [amount, setAmount] = useState("");
	const [refillError, setRefillError] = useState<string | null>(null);
	const [submittingRefill, setSubmittingRefill] = useState(false);
	const refillRequestInFlight = useRef(false);
	const soldOut = product.quantityOnHand === 0;

	useEffect(() => setQuantityDraft(String(product.quantityOnHand)), [product.quantityOnHand]);

	async function saveQuantity() {
		if (exactRequestInFlight.current || pending > 0) return;
		const parsed = parseRefillAmount(quantityDraft);
		if (parsed === null) {
			setQuantityDraft(String(product.quantityOnHand));
			setQuantityError("Enter a whole number from 0 to 2147483647. The change was not saved.");
			return;
		}
		setQuantityError(null);
		setRefillError(null);
		if (parsed === product.quantityOnHand) {
			setQuantityDraft(String(product.quantityOnHand));
			return;
		}
		exactRequestInFlight.current = true;
		try {
			const saved = await onSet(parsed);
			setQuantityDraft(String(saved ?? product.quantityOnHand));
		} finally {
			exactRequestInFlight.current = false;
		}
	}

	function adjustQuantity(delta: number) {
		setQuantityError(null);
		setRefillError(null);
		return onAdjust(delta);
	}

	async function submitRefill(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (refillRequestInFlight.current) return;
		const submittedAmount = new FormData(event.currentTarget).get("amount");
		const parsed = typeof submittedAmount === "string" ? parseRefillAmount(submittedAmount) : null;
		if (parsed === null) {
			setRefillError("Enter a whole number, 0 or more.");
			return;
		}
		setRefillError(null);
		refillRequestInFlight.current = true;
		setSubmittingRefill(true);
		try {
			await adjustQuantity(parsed);
			setAmount("");
			setRefilling(false);
		} finally {
			refillRequestInFlight.current = false;
			setSubmittingRefill(false);
		}
	}

	return (
		<article className="card-warm p-4 sm:p-5" aria-busy={pending > 0}>
			<div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
				<div className="min-w-0 flex-1">
					<h3 className="break-words font-display text-lg font-semibold text-cocoa">{product.name}</h3>
					<p className="mt-1 text-sm font-semibold text-cocoa">{formatCurrency(product.priceCents / 100)}</p>
					{!expanded && product.description && <p className="mt-1 line-clamp-1 break-words text-sm text-muted">{product.description}</p>}
					<p className={`mt-1 text-sm font-semibold ${soldOut ? "text-berry" : "text-success"}`}>{soldOut ? "Sold Out · 0 available" : `${product.quantityOnHand} available`}</p>
					{pending > 0 && <p className="mt-1 text-xs text-muted" role="status">Updating {pending === 1 ? "change" : `${pending} changes`}…</p>}
				</div>
				<div className="flex items-center justify-between gap-2 sm:justify-end">
					<div className="flex items-center gap-2" aria-label={`Change quantity for ${product.name}`}>
						<button type="button" onClick={() => adjustQuantity(-1)} disabled={soldOut} className="flex h-12 w-12 items-center justify-center rounded-button border border-caramel bg-cream text-2xl font-semibold text-caramel disabled:opacity-40" aria-label={`Remove one ${product.name}`}>−</button>
						<input
							type="text"
							inputMode="numeric"
							className="input-base h-12 w-24 text-center text-lg font-semibold tabular-nums"
							aria-label={`${product.name} quantity`}
							value={quantityDraft}
							disabled={pending > 0}
							onChange={(event) => { setQuantityDraft(event.target.value); setQuantityError(null); }}
							onBlur={() => void saveQuantity()}
							onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); } }}
						/>
						<button type="button" onClick={() => adjustQuantity(1)} className="flex h-12 w-12 items-center justify-center rounded-button border border-caramel bg-honey text-2xl font-semibold text-white" aria-label={`Add one ${product.name}`}>+</button>
					</div>
				</div>
			</div>
			{(error || quantityError || refillError) && <p className="mt-3 rounded-lg bg-berry/10 px-3 py-2 text-sm text-berry" role="alert">{error || quantityError || refillError}</p>}
			<div className="mt-3 flex items-center gap-4 border-t border-crust pt-3 text-sm">
				<button type="button" className="min-h-11 font-semibold text-caramel underline underline-offset-4" onClick={() => setRefilling((current) => !current)}>Refill</button>
				<button type="button" className="min-h-11 font-semibold text-caramel underline underline-offset-4" aria-label={`${expanded ? "Hide" : "Show"} details for ${product.name}`} aria-expanded={expanded} aria-controls={detailsId} onClick={() => setExpanded((current) => !current)}>{expanded ? "Hide Details" : "Show Details"}</button>
			</div>
			{refilling && <form className="mt-2 flex flex-wrap items-end gap-2" onSubmit={submitRefill}><label className="min-w-0 flex-1"><span className="mb-1 block text-sm font-medium">Add</span><input className="input-base" name="amount" inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="12" aria-label={`Refill amount for ${product.name}`} /></label><button type="submit" className="btn-primary" disabled={submittingRefill || pending > 0}>{submittingRefill ? "Refilling…" : "Confirm"}</button></form>}
			<div id={detailsId} hidden={!expanded}>
				{expanded && <div className="mt-4 border-t border-crust pt-4">
					<ProductDetails product={product} />
					<div className="mt-4 flex items-center gap-4">
						<button type="button" className="btn-secondary min-h-11" onClick={onEdit}>Edit</button>
						<button type="button" className="min-h-11 text-berry underline underline-offset-4" onClick={onArchive}>Archive</button>
					</div>
				</div>}
			</div>
		</article>
	);
}

export function PastFlavorCard({ product, error, onEdit, onRestore }: { product: AdminMenuProduct; error?: string; onEdit: () => void; onRestore: () => void }) {
	const [expanded, setExpanded] = useState(false);
	const detailsId = useId();
	return (
		<article className="card-warm p-4 sm:p-5">
			<h3 className="break-words font-display text-lg font-semibold text-cocoa">{product.name}</h3>
			<p className="mt-1 text-sm font-semibold text-cocoa">{formatCurrency(product.priceCents / 100)}</p>
			{!expanded && product.description && <p className="mt-1 line-clamp-1 break-words text-sm text-muted">{product.description}</p>}
			{error && <p className="mt-3 rounded-lg bg-berry/10 px-3 py-2 text-sm text-berry" role="alert">{error}</p>}
			<div className="mt-3 flex items-center gap-4 border-t border-crust pt-3 text-sm">
				<button type="button" className="btn-primary min-h-11" onClick={onRestore}>Restore</button>
				<button type="button" className="min-h-11 font-semibold text-caramel underline underline-offset-4" aria-label={`${expanded ? "Hide" : "Show"} details for ${product.name}`} aria-expanded={expanded} aria-controls={detailsId} onClick={() => setExpanded((current) => !current)}>{expanded ? "Hide Details" : "Show Details"}</button>
			</div>
			<div id={detailsId} hidden={!expanded}>
				{expanded && <div className="mt-4 border-t border-crust pt-4">
					<ProductDetails product={product} />
					<button type="button" className="btn-secondary mt-4 min-h-11" onClick={onEdit}>Edit</button>
				</div>}
			</div>
		</article>
	);
}
