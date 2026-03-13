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
		clearCart();
		router.push(`/orders/${json.id}`);
	}

	return (
		<main style={{ maxWidth: 980, margin: "0 auto", padding: 16 }}>
			<h1 style={{ marginBottom: 12 }}>Checkout</h1>

			<div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
				<section style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
					<h2 style={{ marginBottom: 12 }}>Contact</h2>
					<CheckoutForm onSubmit={submit} />
				</section>

				<section style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
					<h2 style={{ marginBottom: 12 }}>Payment</h2>
					<VenmoTile venmoHandle="@CottageBakery" />
				</section>

				<section style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
					<OrderSummary />
					{error && (
						<p style={{ marginTop: 8, color: "#dc2626", marginBottom: 0 }} role="alert">
							{error}
						</p>
					)}
					<p style={{ marginTop: 8, color: "#6b7280" }}>
						After you pay via Venmo, we&apos;ll confirm and update your order status.
					</p>
					<button
						type="submit"
						form="checkout-form"
						disabled={submitting || !items.length}
						style={{ marginTop: 8, padding: "10px 12px", borderRadius: 8, border: "1px solid #111827" }}
					>
						{submitting ? "Submitting..." : "Place Order (Venmo)"}
					</button>
				</section>
			</div>
		</main>
	);
}
