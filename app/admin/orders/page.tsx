"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { OrderRecord, OrderStatus } from "@/lib/orderTypes";

const STATUS_OPTIONS: OrderStatus[] = [
	"AWAITING_PAYMENT",
	"PAID",
	"IN_PROGRESS",
	"READY_FOR_PICKUP",
	"COMPLETED",
	"CANCELED",
];

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
		const key = sessionStorage.getItem("admin_key") ?? "";
		await fetch(`/api/orders/${id}/status`, {
			method: "POST",
			headers: { "Content-Type": "application/json", "x-admin-key": key },
			body: JSON.stringify({ status }),
		});
		fetchList();
	}

	return (
		<main className="mx-auto max-w-4xl px-4 py-6">
			<h1 className="mb-6 font-display text-2xl font-semibold text-cocoa">Orders</h1>

			{error && (
				<p className="mb-4 rounded-lg bg-berry/10 px-4 py-2 text-berry" role="alert">
					{error}
				</p>
			)}

			{orders.length === 0 && !error ? (
				<p className="text-sage">No orders yet.</p>
			) : (
				<div className="flex flex-col gap-4">
					{orders.map((o) => (
						<div key={o.id} className="card-warm p-4 sm:p-6">
							<div className="flex flex-wrap items-baseline justify-between gap-2">
								<div>
									<strong className="text-cocoa">#{o.id}</strong>
									<span className="mx-2 text-sage">—</span>
									<span className="text-cocoa">{o.customer.name}</span>
									<span className="ml-2 rounded-full bg-crust px-2 py-0.5 text-xs font-medium text-caramel">
										{o.status}
									</span>
								</div>
								<Link
									href={`/orders/${o.id}`}
									className="text-sm text-honey hover:underline"
								>
									View order
								</Link>
							</div>
							<div className="mt-4 flex flex-wrap gap-2">
								{STATUS_OPTIONS.map((s) => (
									<button
										key={s}
										onClick={() => setStatus(o.id, s)}
										className={`rounded-button px-3 py-1.5 text-sm font-medium transition-colors ${
											o.status === s
												? "border border-caramel bg-honey text-white"
												: "btn-secondary"
										}`}
									>
										{s.replace(/_/g, " ")}
									</button>
								))}
							</div>
						</div>
					))}
				</div>
			)}
		</main>
	);
}