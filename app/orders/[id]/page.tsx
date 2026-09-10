"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { PublicOrderTracking } from "@/lib/orderTypes";
import { formatCurrency } from "@/lib/menuCatalog";

export default function OrderPage() {
	const { id: token } = useParams<{ id: string }>();
	const [order, setOrder] = useState<PublicOrderTracking | null>(null);
	const [loadError, setLoadError] = useState<string | null>(null);

	useEffect(() => {
		let t: number;
		async function poll() {
			const res = await fetch(`/api/orders/track/${token}`, { cache: "no-store" });
			if (res.ok) {
				setLoadError(null);
				const o: PublicOrderTracking = await res.json();
				setOrder(o);
				if (["READY_FOR_PICKUP", "COMPLETED", "CANCELED"].includes(o.fulfillmentStatus)) return;
			} else if (res.status === 404 || res.status === 503) {
				const body = await res.json().catch(() => ({}));
				setLoadError(
					(body as { error?: string }).error ??
						(res.status === 404 ? "We couldn’t find this order." : "Order lookup is temporarily unavailable.")
				);
				return;
			}
			t = window.setTimeout(poll, 15000);
		}
		poll();
		return () => clearTimeout(t);
	}, [token]);

	if (loadError) {
		return (
			<main className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
				<p className="rounded-lg bg-berry/10 px-4 py-3 text-cocoa" role="alert">
					{loadError}
				</p>
			</main>
		);
	}
	if (!order)
		return (
			<main className="px-4 py-6">
				<p className="text-sage">Loading order…</p>
			</main>
		);

	const isAwaitingPayment = order.payment.status === "PENDING";

	return (
		<main className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
			<h1 className="mb-6 font-display text-3xl font-semibold text-cocoa">Your order</h1>
			{isAwaitingPayment && (
				<div className="mb-6 rounded-lg border border-crust bg-wheat p-4">
					<p className="font-semibold text-cocoa">Order placed!</p>
					<p className="mt-2 text-sm text-cocoa/80">
						Payment is pending. The baker will update it after manually confirming {order.payment.method} payment.
					</p>
				</div>
			)}
			<div className="mb-6 rounded-lg border border-crust bg-wheat px-4 py-3">
				<span className="text-sage">Status:</span>{" "}
				<strong className="text-cocoa">{order.fulfillmentStatus.replaceAll("_", " ")}</strong>
				<span className="ml-4 text-sage">Payment:</span>{" "}
				<strong className="text-cocoa">{order.payment.status}</strong>
			</div>

			<section>
				{order.items.map((i, index) => (
					<div
						key={`${i.productId}-${index}`}
						className="mb-2 grid grid-cols-[1fr_auto] items-center gap-4 rounded-lg border border-crust bg-wheat p-4"
					>
						<div>
							<div className="font-semibold text-cocoa">{i.name}</div>
							<div className="text-xs text-sage">
								{formatCurrency(i.unitPriceCents / 100)} × {i.quantity}
							</div>
						</div>
						<div className="text-right font-semibold text-cocoa">{formatCurrency(i.lineTotalCents / 100)}</div>
					</div>
				))}
				<div className="mt-4 flex justify-between font-semibold text-cocoa">
					<span className="text-sage">Total</span>
					<span>{formatCurrency(order.totals.totalCents / 100)}</span>
				</div>
			</section>
		</main>
	);
}
