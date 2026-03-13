"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type FlavorRequest = {
	id: string;
	item_id: string;
	customer_email: string;
	customer_name: string | null;
	notes: string | null;
	status: string;
	created_at: string;
};

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
			<main style={{ maxWidth: 720, margin: "0 auto", padding: 16 }}>
				<p>Loading...</p>
			</main>
		);
	}

	return (
		<main style={{ maxWidth: 720, margin: "0 auto", padding: 16 }}>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
				<h1>Flavor Requests</h1>
				<div style={{ display: "flex", gap: 8 }}>
					<Link href="/admin/orders" style={{ color: "#111827" }}>
						Orders
					</Link>
					<Link href="/admin/inventory" style={{ color: "#111827" }}>
						Inventory
					</Link>
				</div>
			</div>

			{requests.length === 0 ? (
				<p style={{ color: "#6b7280" }}>No flavor requests yet.</p>
			) : (
				<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
					{requests.map((r) => (
						<div
							key={r.id}
							style={{
								padding: 12,
								border: "1px solid #e5e7eb",
								borderRadius: 8,
								display: "flex",
								flexDirection: "column",
								gap: 8,
							}}
						>
							<div>
								<strong>{r.item_id}</strong> — {r.customer_email}
								{r.customer_name && ` (${r.customer_name})`}
							</div>
							{r.notes && <div style={{ color: "#6b7280", fontSize: 14 }}>{r.notes}</div>}
							<div style={{ display: "flex", gap: 8, alignItems: "center" }}>
								<span style={{ fontSize: 12, color: "#6b7280" }}>Status: {r.status}</span>
								{["pending", "notified", "ignored"].map((s) => (
									<button
										key={s}
										onClick={() => setStatus(r.id, s)}
										style={{
											padding: "4px 8px",
											fontSize: 12,
											borderRadius: 4,
											border: "1px solid #e5e7eb",
											background: r.status === s ? "#111827" : "#fff",
											color: r.status === s ? "#fff" : "#111827",
										}}
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
