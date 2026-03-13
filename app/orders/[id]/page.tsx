"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import type { OrderRecord } from "@/lib/orderTypes";
import { formatCurrency } from "@/lib/menuCatalog";

export default function OrderPage() {
	const { id } = useParams<{ id: string }>();
	const [order, setOrder] = useState<OrderRecord | null>(null);

	useEffect(() => {
		let t: number;
		async function poll() {
			const res = await fetch(`/api/orders/${id}`, { cache: "no-store" });
			if (res.ok) {
				const o: OrderRecord = await res.json();
				setOrder(o);
				if (["READY_FOR_PICKUP", "COMPLETED", "CANCELED"].includes(o.status)) return;
			}
			t = window.setTimeout(poll, 15000);
		}
		poll();
		return () => clearTimeout(t);
	}, [id]);

	const subtotal = useMemo(() => order?.items.reduce((s, i) => s + i.price * i.qty, 0) ?? 0, [order]);
	if (!order)
		return (
			<main style={{ padding: 16 }}>
				<p>Loading Order...</p>
			</main>
		);

	const isAwaitingPayment = order.status === "AWAITING_PAYMENT";

	return (
		<main style={{ maxWidth: 720, margin: "0 auto", padding: 16 }}>
			<h1>Order #{order.id}</h1>
			{isAwaitingPayment && (
				<div style={{ padding: 12, borderRadius: 8, background: "#eff6ff", border: "1px solid #93c5fd", marginBottom: 16 }}>
					<p style={{ margin: 0, fontWeight: 600 }}>Order placed!</p>
					<p style={{ margin: "8px 0 0", color: "#1e40af" }}>
						Pay via Venmo and we&apos;ll confirm your order. You can check back here for status updates.
					</p>
				</div>
			)}
			<div style={{ padding: 8, borderRadius: 8, background: "#f3f4f6", margin: "8px 0" }}>
				Status: <strong>{order.status.replaceAll("_", " ")}</strong>
			</div>

			<section style={{ marginTop: 12 }}>
				{order.items.map((i) => (
					<div
						key={i.id}
						style={{
							display: "grid",
							gridTemplateColumns: "1fr auto",
							gap: 8,
							padding: 8,
							border: "1px solid #e5e7eb",
							borderRadius: 10,
							marginBottom: 6,
						}}
					>
						<div>
							<div style={{ fontWeight: 600 }}>{i.name}</div>
							<div style={{ color: "#6b7280", fontSize: 12 }}>
								{formatCurrency(i.price)} x {i.qty}
							</div>
						</div>
						<div style={{ textAlign: "right", fontWeight: 600 }}>{formatCurrency(i.price * i.qty)}</div>
					</div>
				))}
				<div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
					<span style={{ color: "#6b7280" }}>Total</span>
					<span>{formatCurrency(subtotal)}</span>
				</div>
			</section>
		</main>
	);
}
