"use client";

import { useEffect, useState } from "react";

type FlavorRequest = {
	id: string;
	item_id: string;
	customer_email: string;
	customer_name: string | null;
	notes: string | null;
	status: string;
	created_at: string;
};

const STATUS_OPTIONS = ["pending", "notified", "ignored"] as const;

export default function AdminFlavorRequestsPage() {
	const [requests, setRequests] = useState<FlavorRequest[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const key = sessionStorage.getItem("admin_key") ?? "";
		if (!key) {
			window.location.href = "/admin/login";
			return;
		}
		fetch("/api/admin/flavor-requests", { headers: { "x-admin-key": key } })
			.then((r) => r.json())
			.then((data) => setRequests(Array.isArray(data) ? data : []))
			.finally(() => setLoading(false));
	}, []);

	async function setStatus(id: string, status: string) {
		const key = sessionStorage.getItem("admin_key") ?? "";
		const res = await fetch("/api/admin/flavor-requests", {
			method: "PATCH",
			headers: { "Content-Type": "application/json", "x-admin-key": key },
			body: JSON.stringify({ id, status }),
		});
		if (res.ok) {
			const updated = await res.json();
			setRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
		}
	}

	if (loading) {
		return (
			<main className="mx-auto max-w-3xl px-4 py-6">
				<p className="text-sage">Loading...</p>
			</main>
		);
	}

	return (
		<main className="mx-auto max-w-3xl px-4 py-6">
			<h1 className="mb-6 font-display text-2xl font-semibold text-cocoa">Flavor Requests</h1>

			{requests.length === 0 ? (
				<p className="text-sage">No flavor requests yet.</p>
			) : (
				<div className="flex flex-col gap-4">
					{requests.map((r) => (
						<div key={r.id} className="card-warm p-4 sm:p-6">
							<div>
								<strong className="text-cocoa">{r.item_id}</strong>
								<span className="mx-2 text-sage">—</span>
								<span className="text-cocoa">{r.customer_email}</span>
								{r.customer_name && (
									<span className="text-sage"> ({r.customer_name})</span>
								)}
							</div>
							{r.notes && (
								<div className="mt-2 text-sm text-sage">{r.notes}</div>
							)}
							<div className="mt-4 flex flex-wrap items-center gap-2">
								<span className="text-xs text-sage">Status: {r.status}</span>
								{STATUS_OPTIONS.map((s) => (
									<button
										key={s}
										onClick={() => setStatus(r.id, s)}
										className={`rounded-button px-3 py-1.5 text-sm font-medium transition-colors ${
											r.status === s
												? "border border-caramel bg-honey text-white"
												: "btn-secondary"
										}`}
									>
										{s}
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
