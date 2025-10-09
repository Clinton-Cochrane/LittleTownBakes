"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "./useCart";
import { formatCurrency } from "@/lib/menuCatalog";
import CartLine from "./CartLine";

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

	//group by category
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

	//focus + scroll lock
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

	//esc to close
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
			<style>{`
        .cart-overlay {
        position: fixed; inset: 0; background: rgba(0,0,0,0.45);
        opacity: ${open ? 1 : 0}; pointer-events: ${open ? "auto" : "none"};
        transition: opacity 160ms ease; z-index: 50;
        }
        .cart-panel {
        position: fixed; top: 0; right: 0; height: 100%; background: #fff;
        width: 100%; max-width: 420px; box-shadow: -8px 0 24px rgba(0,0,0,0.15);
        transform: translateX(${open ? "0%" : "100%"}); transition: transform 200ms ease;
        display: flex; flex-direction: column; z-index: 51; outline: none;
        }
        @media (min-width: 768px) { .cart-panel { width: 90vw; max-width: 420px; } }
        .cart-header { display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-bottom:1px solid #e5e7eb; }
        .cart-body { flex:1; overflow:auto; padding: 8px 16px 100px; }
        .cart-footer { position: sticky; bottom: 0; background: #fff; border-top:1px solid #e5e7eb; padding: 12px 16px; display: grid; gap: 8px; }
        .btn { display:inline-flex; align-items:center; justify-content:center; gap:8px; border:1px solid #111827; border-radius:8px; padding:10px 12px; background:#111827; color:#fff; cursor:pointer; }
        .btn.secondary { background:#fff; color:#111827; }
        .btn.danger { background:#b91c1c; border-color:#b91c1c; }
        .btn:disabled { opacity:0.6; cursor:not-allowed; }
        .category-title { margin: 12px 0 6px; font-weight:600; color:#111827; }
        .notes { width:100%; min-height:64px; padding:8px; border:1px solid #e5e7eb; border-radius:8px; resize: vertical; }
        .row { display:flex; justify-content:space-between; align-items:center; }
        .muted { color:#6b7280; font-size: 12px; }
        .total { font-weight:700; }
      `}</style>

			<div className="cart-overlay" onClick={onClose} aria-hidden={!open} />
			<aside
				ref={panelRef}
				tabIndex={-1}
				className="cart-panel"
				role="dialog"
				aria-modal="true"
				aria-label="Shopping Cart"
			>
				{/*Header*/}
				<div className="cart-header">
					<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
						<span role="img" aria-label="cart">
							🛒
						</span>
						<strong>Cart</strong>
					</div>
					<button className="btn secondary" onClick={onClose} aria-label="Close cart">
						Close Cart
					</button>
				</div>

				{/* Body */}
				<div className="cart-body">
					{items.length === 0 ? (
						<p className="muted">Your cart is Empty</p>
					) : (
						<>
							{groups.map((g) => (
								<section key={g.category}>
									<div className="category-title">{g.category}</div>
									<div style={{ display: "grid", gap: 8 }}>
										{g.items.map((it) => (
											<CartLine key={it.id} itemId={it.id} onRemove={() => removeItem(it.id)} />
										))}
									</div>
								</section>
							))}
							<div style={{ marginTop: 12 }}>
								<label htmlFor="order-notes" className="muted" style={{ display: "block", marginBottom: 6 }}>
									Order Notes (optional)
								</label>
								<textarea
									id="order-notes"
									className="notes"
									placeholder="Allergies, pickup details, etc."
									value={notes}
									onChange={(e) => setNotes(e.target.value)}
								/>
							</div>
						</>
					)}
				</div>
				{/* Footer / Summary */}
				<div className="cart-footer">
					<div className="row">
						<span className="muted">Subtotal</span>
						<span>{formatCurrency(subtotal)}</span>
					</div>
					<div className="row">
						<span className="muted">Tax</span>
						<span className="muted">Calculated at checkout</span>
					</div>
					<div className="row total">
						<span>Total</span>
						<span>{formatCurrency(subtotal)}</span>
					</div>

					<div style={{ display: "flex", gap: 8 }}>
						<button className="btn secondary" onClick={onClose}>
							Continue shopping
						</button>
						<button className="btn danger" onClick={clearCart}>
							Clear
						</button>
						<button className="btn" disabled={items.length === 0} onClick={onCheckout}>
							Checkout
						</button>
					</div>
				</div>
			</aside>
		</>
	);
}
