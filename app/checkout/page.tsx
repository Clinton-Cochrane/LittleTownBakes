"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import { useCart } from "@/components/cart/useCart";
import OrderSummary from "@/components/checkout/OrderSummary";
import CheckoutForm, { CheckoutData } from "@/components/checkout/paymentTiles/CheckoutForm";
import VenmoTile from "@/components/checkout/paymentTiles/VenmoTile";

export default function CheckoutPage() {
	const router = useRouter();
	const { items, clearCart, hydrated } = useCart();
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (hydrated && items.length === 0) {
			router.replace("/");
		}
	}, [hydrated, items.length, router]);

	const subtotal = useMemo(() => items.reduce((s, i) => s + i.price * i.qty, 0), [items]);

	async function submit(data: CheckoutData) {
		if (!items.length) return;
		setSubmitting(true);
		setError(null);
		const payload = {
			customer: data,
			items: items.map((i) => ({ id: i.id, name: i.name, price: i.price, qty: i.qty })),
			totals: { subtotal, tax: 0, total: subtotal },
		};
		const res = await fetch("/api/orders", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});
		setSubmitting(false);
		let json: { id?: string; error?: string };
		try {
			json = await res.json();
		} catch {
			json = {};
		}
		if (!res.ok) {
			setError(json.error ?? "Order failed. Please try again.");
			return;
		}
		if (!json.id) {
			setError("Order created but received invalid response. Please contact the bakery.");
			return;
		}
		clearCart();
		router.push(`/orders/${json.id}`);
	}

	return (
		<main className="mx-auto max-w-3xl px-4 py-6">
			<h1 className="mb-6 font-display text-3xl font-semibold text-cocoa">Checkout</h1>

			<div className="grid gap-6">
				<section className="card-warm p-6 sm:p-8">
					<h2 className="mb-4 font-display text-xl font-semibold text-cocoa">Contact</h2>
					<CheckoutForm onSubmit={submit} />
				</section>

				<section className="card-warm p-6 sm:p-8">
					<h2 className="mb-4 font-display text-xl font-semibold text-cocoa">Payment</h2>
					<VenmoTile venmoHandle={process.env.NEXT_PUBLIC_VENMO_HANDLE || "@LittleTownBakes"} />
				</section>

				<section className="card-warm p-6 sm:p-8">
					<OrderSummary />
					{error && (
						<p className="mt-4 text-berry" role="alert">
							{error}
						</p>
					)}
					<p className="mt-4 text-sm text-sage">
						After you pay via Venmo, we&apos;ll confirm and update your order status.
					</p>
					<button
						type="submit"
						form="checkout-form"
						disabled={submitting || !items.length}
						className="btn-primary mt-4"
					>
						{submitting ? "Submitting..." : "Place Order (Venmo)"}
					</button>
				</section>
			</div>
		</main>
	);
}
