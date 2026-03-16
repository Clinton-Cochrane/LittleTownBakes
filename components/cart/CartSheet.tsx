"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "./useCart";
import { formatCurrency } from "@/lib/menuCatalog";
import CartLine from "./CartLine";
import ShoppingBagIcon from "@/components/icons/ShoppingBagIcon";

type CartSheetProps = {
	open: boolean;
	onClose: () => void;
	onCheckout?: () => void;
};

export default function CartSheet({ open, onClose, onCheckout }: CartSheetProps) {
	const { items, removeItem, clearCart } = useCart();
	const [notes, setNotes] = useState("");
	const panelRef = useRef<HTMLDivElement | null>(null);
	const lastFocusedRef = useRef<HTMLElement | null>(null);

	const groups = useMemo(() => {
		const map = new Map<string, typeof items>();
		for (const it of items) {
			const key = it.categoryName || "Items";
			const arr = map.get(key) ?? [];
			arr.push(it);
			map.set(key, arr);
		}
		return Array.from(map.entries()).map(([category, items]) => ({ category, items }));
	}, [items]);

	const subtotal = useMemo(() => items.reduce((sum, i) => sum + i.price * i.qty, 0), [items]);

	useEffect(() => {
		if (open) {
			lastFocusedRef.current = document.activeElement as HTMLElement;
			panelRef.current?.focus();
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
			lastFocusedRef.current?.focus();
		}
		return () => {
			document.body.style.overflow = "";
		};
	}, [open]);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape" && open) {
				e.preventDefault();
				onClose();
			}
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [open, onClose]);

	return (
		<>
			<div
				className={`fixed inset-0 z-50 bg-cocoa/30 transition-opacity duration-200 ease-out ${open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
				onClick={onClose}
				aria-hidden={!open}
			/>
			<aside
				ref={panelRef}
				tabIndex={-1}
				className={`fixed top-0 right-0 z-[51] flex h-full w-full max-w-[420px] flex-col bg-cream text-cocoa shadow-card outline-none transition-transform duration-200 ease-out md:w-[90vw] ${open ? "translate-x-0" : "translate-x-full"}`}
				role="dialog"
				aria-modal="true"
				aria-label="Shopping Cart"
			>
				<div className="flex items-center justify-between border-b border-crust px-5 py-4">
					<div className="flex items-center gap-2">
						<ShoppingBagIcon size={22} className="text-cocoa" />
						<strong className="font-display text-lg">Cart</strong>
					</div>
					<button className="btn-secondary" onClick={onClose} aria-label="Close cart">
						Close Cart
					</button>
				</div>

				<div className="flex-1 overflow-auto px-4 pb-24 pt-2">
					{items.length === 0 ? (
						<p className="text-sm text-sage">Your cart is empty. Add something delicious!</p>
					) : (
						<>
							{groups.map((g) => (
								<section key={g.category} className="mb-4">
									<div className="mb-2 font-display font-semibold text-cocoa">{g.category}</div>
									<div className="grid gap-2">
										{g.items.map((it) => (
											<CartLine key={it.id} itemId={it.id} onRemove={() => removeItem(it.id)} />
										))}
									</div>
								</section>
							))}
							<div className="mt-4">
								<label htmlFor="order-notes" className="mb-1.5 block text-xs text-sage">
									Order Notes (optional)
								</label>
								<textarea
									id="order-notes"
									className="input-base min-h-16 resize-y"
									placeholder="Allergies, pickup details, etc."
									value={notes}
									onChange={(e) => setNotes(e.target.value)}
								/>
							</div>
						</>
					)}
				</div>

				<div className="sticky bottom-0 border-t border-crust bg-cream p-5">
					<div className="mb-4 grid gap-2">
						<div className="flex justify-between">
							<span className="text-sm text-sage">Subtotal</span>
							<span className="font-semibold">{formatCurrency(subtotal)}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-sm text-sage">Tax</span>
							<span className="text-sm text-sage">Calculated at checkout</span>
						</div>
						<div className="flex justify-between font-bold">
							<span>Total</span>
							<span className="text-lg">{formatCurrency(subtotal)}</span>
						</div>
					</div>

					<div className="flex flex-wrap gap-2 sm:flex-nowrap">
						<button className="btn-secondary" onClick={onClose}>
							Continue shopping
						</button>
						<button className="btn-danger" onClick={clearCart}>
							Clear
						</button>
						<button className="btn-primary" disabled={items.length === 0} onClick={onCheckout}>
							Checkout
						</button>
					</div>
				</div>
			</aside>
		</>
	);
}
