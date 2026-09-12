"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { PublicOrderTracking } from "@/lib/orderTypes";
import OrderDetails from "@/components/orders/OrderDetails";

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
				<p className="text-muted">Loading order…</p>
			</main>
		);
	return <OrderDetails order={order} />;
}
