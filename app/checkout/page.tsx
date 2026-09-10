"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useCart } from "@/components/cart/useCart";
import OrderSummary from "@/components/checkout/OrderSummary";
import CheckoutForm, { CheckoutData } from "@/components/checkout/paymentTiles/CheckoutForm";
import VenmoTile from "@/components/checkout/paymentTiles/VenmoTile";
import type { PaymentMethod } from "@/lib/orderTypes";
import { formatPickupWindow, type CustomerPickupWindow } from "@/lib/pickupWindows";

export default function CheckoutPage() {
	const router = useRouter();
	const { items, clearCart, hydrated } = useCart();
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("venmo");
	const [pickupWindows, setPickupWindows] = useState<CustomerPickupWindow[]>([]);
	const [pickupWindowId, setPickupWindowId] = useState("");
	const [pickupLoading, setPickupLoading] = useState(true);
	const orderPlacedRef = useRef(false);

	async function loadPickupWindows() {
		setPickupLoading(true);
		const response = await fetch("/api/pickup-windows", { cache: "no-store" });
		if (!response.ok) {
			setPickupWindows([]);
			setError("Pickup times are temporarily unavailable. Please try again.");
			setPickupLoading(false);
			return;
		}
		const available = await response.json();
		setPickupWindows(Array.isArray(available) ? available : []);
		setPickupWindowId((current) => available.some((window: CustomerPickupWindow) => window.id === current) ? current : "");
		setPickupLoading(false);
	}

	useEffect(() => { void loadPickupWindows(); }, []);

	useEffect(() => {
		if (orderPlacedRef.current) return;
		if (hydrated && items.length === 0) {
			router.replace("/");
		}
	}, [hydrated, items.length, router]);

	async function submit(data: CheckoutData) {
		if (!items.length || !pickupWindowId) {
			setError("Choose an available pickup time.");
			return;
		}
		setSubmitting(true);
		setError(null);
		const payload = {
			customer: { name: data.name, email: data.email, phone: data.phone, notes: data.notes },
			payment: { method: data.paymentMethod, venmoUser: data.venmoUser, note: data.paymentNote },
			pickupWindowId,
			items: items.map((item) => ({ productId: item.id, quantity: item.qty })),
		};
		const res = await fetch("/api/orders", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});
		setSubmitting(false);
		let json: { trackingToken?: string; code?: string; error?: string };
		try {
			json = await res.json();
		} catch {
			json = {};
		}
		if (!res.ok) {
			setError(json.error ?? "Order failed. Please try again.");
			if (json.code === "PICKUP_WINDOW_UNAVAILABLE") {
				setPickupWindowId("");
				void loadPickupWindows();
			}
			return;
		}
		if (!json.trackingToken) {
			setError("Order created but received invalid response. Please contact the bakery.");
			return;
		}
		orderPlacedRef.current = true;
		clearCart();
		router.push(`/orders/${json.trackingToken}`);
	}

	return (
		<main className="mx-auto max-w-3xl px-4 py-6">
			<h1 className="mb-6 font-display text-3xl font-semibold text-cocoa">Checkout</h1>

			<div className="grid gap-6">
				<section className="card-warm p-6 sm:p-8">
					<h2 className="mb-2 font-display text-xl font-semibold text-cocoa">Pickup time</h2>
					<p className="mb-4 text-sm text-sage">Choose a bakery pickup window. All times are Pacific Time.</p>
					{pickupLoading ? <p className="text-sage">Loading pickup times...</p> : pickupWindows.length === 0 ? (
						<p className="rounded-lg bg-berry/10 px-4 py-3 text-cocoa" role="status">No pickup times are currently available. Please check back soon.</p>
					) : (
						<label>
							<span className="mb-1.5 block text-sm font-medium text-cocoa">Pickup window *</span>
							<select value={pickupWindowId} onChange={(event) => setPickupWindowId(event.target.value)} required className="input-base">
								<option value="">Select pickup time</option>
								{pickupWindows.map((window) => <option key={window.id} value={window.id}>{formatPickupWindow(window)}</option>)}
							</select>
						</label>
					)}
				</section>

				<section className="card-warm p-6 sm:p-8">
					<h2 className="mb-4 font-display text-xl font-semibold text-cocoa">Contact & Payment</h2>
					<CheckoutForm onSubmit={submit} onPaymentMethodChange={setPaymentMethod} />
				</section>

				{paymentMethod === "venmo" && (
					<section className="card-warm p-6 sm:p-8">
						<h2 className="mb-4 font-display text-xl font-semibold text-cocoa">Pay with Venmo</h2>
						<VenmoTile venmoHandle={process.env.NEXT_PUBLIC_VENMO_HANDLE || "@LittleTownBakes"} />
					</section>
				)}

				<section className="card-warm p-6 sm:p-8">
					<OrderSummary />
					{error && (
						<p className="mt-4 text-berry" role="alert">
							{error}
						</p>
					)}
					<p className="mt-4 text-sm text-sage">
						{paymentMethod === "venmo"
							? "After you pay via Venmo, we'll confirm and update your order status."
							: paymentMethod === "zelle"
								? "Send payment via Zelle. The baker will verify it manually."
								: "Pay with cash at pickup. Your order can be prepared while payment is pending."}
					</p>
					<button
						type="submit"
						form="checkout-form"
						disabled={submitting || !items.length || pickupLoading || !pickupWindowId}
						className="btn-primary mt-4"
					>
						{submitting ? "Submitting..." : "Place Order"}
					</button>
				</section>
			</div>
		</main>
	);
}
