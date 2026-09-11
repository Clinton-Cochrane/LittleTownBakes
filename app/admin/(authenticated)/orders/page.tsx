"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { handleAdminAuthFailure } from "@/lib/adminResponse";
import type { AdminOrderRecord, FulfillmentStatus, PaymentStatus } from "@/lib/orderTypes";
import { formatCurrency } from "@/lib/menuCatalog";
import { formatPickupWindow } from "@/lib/pickupWindows";
import {
	getAllowedNextStatuses,
	orderStatusActionLabel,
	orderStatusAdvanceLabel,
	PIPELINE_STATUSES,
} from "@/lib/orderStatusFlow";

function pipelineIndex(status: FulfillmentStatus): number {
	if (status === "CANCELED") return -1;
	return PIPELINE_STATUSES.indexOf(status);
}

export default function AdminOrders() {
	const [orders, setOrders] = useState<AdminOrderRecord[]>([]);
	const [error, setError] = useState<string | null>(null);

	async function fetchList() {
		setError(null);
		const res = await fetch("/api/admin/list");
		if (!res.ok) {
			const authError = handleAdminAuthFailure(res);
			if (authError) return setError(authError);
			const body = await res.json().catch(() => ({}));
			setError((body as { error?: string }).error ?? `Failed to load orders (${res.status})`);
			return;
		}
		const data = await res.json();
		setOrders(Array.isArray(data) ? data : []);
	}

	useEffect(() => {
		fetchList();
	}, []);

	async function updateOrder(id: string, change: { fulfillmentStatus: FulfillmentStatus } | { paymentStatus: PaymentStatus }) {
		setError(null);
		const res = await fetch(`/api/orders/${id}/status`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(change),
		});
		if (!res.ok) {
			const authError = handleAdminAuthFailure(res);
			if (authError) return setError(authError);
			const body = await res.json().catch(() => ({}));
			setError(
				(body as { error?: string }).error ??
					`Could not update order (${res.status}). Check the workflow: advance one step at a time.`
			);
			return;
		}
		fetchList();
	}

	return (
		<main className="mx-auto max-w-4xl px-4 py-6">
			<h1 className="mb-2 font-display text-2xl font-semibold text-cocoa">Orders</h1>
			<p className="mb-6 text-sm text-sage">
				Track payment independently while moving fulfillment from received through pickup.
			</p>

			{error && (
				<p className="mb-4 rounded-lg bg-berry/10 px-4 py-2 text-berry" role="alert">
					{error}
				</p>
			)}

			{orders.length === 0 && !error ? (
				<p className="text-sage">No orders yet.</p>
			) : (
				<div className="flex flex-col gap-6">
					{orders.map((o) => (
						<OrderCard key={o.id} order={o} onUpdate={updateOrder} />
					))}
				</div>
			)}
		</main>
	);
}

function OrderCard({
	order: o,
	onUpdate,
}: {
	order: AdminOrderRecord;
	onUpdate: (id: string, change: { fulfillmentStatus: FulfillmentStatus } | { paymentStatus: PaymentStatus }) => void;
}) {
	const idx = pipelineIndex(o.fulfillmentStatus);
	const nextOptions = getAllowedNextStatuses(o.fulfillmentStatus);
	const isCanceled = o.fulfillmentStatus === "CANCELED";

	return (
		<div className="card-warm overflow-hidden p-4 sm:p-6">
			<div className="flex flex-wrap items-baseline justify-between gap-2">
				<div>
					<strong className="text-cocoa">#{o.id}</strong>
					<span className="mx-2 text-sage">—</span>
					<span className="text-cocoa">{o.customer.name}</span>
				</div>
				{o.trackingToken && (
					<Link href={`/orders/${o.trackingToken}`} className="text-sm font-medium text-honey hover:underline">
						View order
					</Link>
				)}
			</div>
			<div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-cocoa">
				<span>Payment: <strong>{o.payment.status}</strong> via {o.payment.method}</span>
				{o.payment.status === "PENDING" && !isCanceled && (
					<button type="button" className="btn-primary" onClick={() => onUpdate(o.id, { paymentStatus: "PAID" })}>Mark paid</button>
				)}
			</div>
			{o.pickup && (
				<p className="mt-3 rounded-lg border border-crust bg-cream/80 px-3 py-2 text-cocoa">
					<strong>Pickup:</strong> {formatPickupWindow(o.pickup, "short")}
				</p>
			)}
			<ul className="mt-4 space-y-1 text-sm text-cocoa">
				{o.items.map((item) => (
					<li key={item.productId} className="flex justify-between gap-4">
						<span>{item.quantity} × {item.name}</span>
						<span>{formatCurrency(item.lineTotalCents / 100)}</span>
					</li>
				))}
			</ul>
			<p className="mt-2 text-right font-semibold text-cocoa">Total: {formatCurrency(o.totals.totalCents / 100)}</p>

			{isCanceled ? (
				<p className="mt-4 rounded-lg border border-crust bg-cream/80 px-3 py-2 text-sm text-caramel">
					<strong>Canceled</strong> — no further changes.
				</p>
			) : o.fulfillmentStatus === "COMPLETED" ? (
				<p className="mt-4 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-cocoa">
					<strong>Completed</strong> — this order is finished.
				</p>
			) : (
				<>
					<div className="mt-5 overflow-x-auto pb-1">
						<ol className="flex min-w-[min(100%,520px)] items-start gap-0">
							{PIPELINE_STATUSES.map((step, i) => {
								const active = idx === i;
								const done = idx > i;
								const isLast = i === PIPELINE_STATUSES.length - 1;
								return (
									<li key={step} className="flex min-w-0 flex-1 flex-col items-center">
										<div className="flex w-full items-center">
											<div
												className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
													done
														? "bg-success text-white"
														: active
															? "bg-honey text-white ring-2 ring-honey/40 ring-offset-2 ring-offset-wheat"
															: "border border-crust bg-cream text-sage"
												}`}
											>
												{done ? "✓" : i + 1}
											</div>
											{!isLast && (
												<div
													className={`mx-1 h-0.5 min-w-[12px] flex-1 ${done ? "bg-success/70" : "bg-crust"}`}
													aria-hidden
												/>
											)}
										</div>
										<span
											className={`mt-2 max-w-28 text-center text-[10px] font-medium leading-tight sm:text-xs ${
												active ? "text-cocoa" : "text-sage"
											}`}
										>
											{orderStatusActionLabel(step)}
										</span>
									</li>
								);
							})}
						</ol>
					</div>

					<div className="mt-5 flex flex-wrap gap-2">
						{nextOptions.map((s) => (
							<button
								key={s}
								type="button"
								onClick={() => onUpdate(o.id, { fulfillmentStatus: s })}
								className={
									s === "CANCELED"
										? "btn-danger"
										: "btn-primary"
								}
							>
								{orderStatusAdvanceLabel(s)}
							</button>
						))}
					</div>
				</>
			)}
		</div>
	);
}
