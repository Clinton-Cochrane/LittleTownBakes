"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { OrderRecord, OrderStatus } from "@/lib/orderTypes";
import {
	getAllowedNextStatuses,
	orderStatusActionLabel,
	orderStatusAdvanceLabel,
	PIPELINE_STATUSES,
} from "@/lib/orderStatusFlow";

function pipelineIndex(status: OrderStatus): number {
	if (status === "CANCELED") return -1;
	return PIPELINE_STATUSES.indexOf(status);
}

export default function AdminOrders() {
	const [orders, setOrders] = useState<OrderRecord[]>([]);
	const [error, setError] = useState<string | null>(null);

	async function fetchList() {
		setError(null);
		const key = sessionStorage.getItem("admin_key") ?? "";
		const res = await fetch("/api/admin/list", { headers: { "x-admin-key": key } });
		if (!res.ok) {
			if (res.status === 401) {
				setError("Session expired. Please log in again.");
				window.location.href = "/admin/login";
				return;
			}
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

	async function setStatus(id: string, status: OrderStatus) {
		setError(null);
		const key = sessionStorage.getItem("admin_key") ?? "";
		const res = await fetch(`/api/orders/${id}/status`, {
			method: "POST",
			headers: { "Content-Type": "application/json", "x-admin-key": key },
			body: JSON.stringify({ status }),
		});
		if (!res.ok) {
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
				Move each order forward one step at a time: payment → kitchen → ready → picked up. Cancel anytime before
				completion.
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
						<OrderCard key={o.id} order={o} onSetStatus={setStatus} />
					))}
				</div>
			)}
		</main>
	);
}

function OrderCard({
	order: o,
	onSetStatus,
}: {
	order: OrderRecord;
	onSetStatus: (id: string, status: OrderStatus) => void;
}) {
	const idx = pipelineIndex(o.status);
	const nextOptions = getAllowedNextStatuses(o.status);
	const isCanceled = o.status === "CANCELED";

	return (
		<div className="card-warm overflow-hidden p-4 sm:p-6">
			<div className="flex flex-wrap items-baseline justify-between gap-2">
				<div>
					<strong className="text-cocoa">#{o.id}</strong>
					<span className="mx-2 text-sage">—</span>
					<span className="text-cocoa">{o.customer.name}</span>
				</div>
				<Link href={`/orders/${o.id}`} className="text-sm font-medium text-honey hover:underline">
					View order
				</Link>
			</div>

			{isCanceled ? (
				<p className="mt-4 rounded-lg border border-crust bg-cream/80 px-3 py-2 text-sm text-caramel">
					<strong>Canceled</strong> — no further changes.
				</p>
			) : o.status === "COMPLETED" ? (
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
								onClick={() => onSetStatus(o.id, s)}
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
