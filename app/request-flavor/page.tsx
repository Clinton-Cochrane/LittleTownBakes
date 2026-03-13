"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ArchivedItem = { id: string; name: string };

export default function RequestFlavorPage() {
	const [archivedItems, setArchivedItems] = useState<ArchivedItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [submitted, setSubmitted] = useState(false);
	const [form, setForm] = useState({
		item_id: "",
		customer_email: "",
		customer_name: "",
		notes: "",
	});
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		fetch("/api/menu")
			.then((r) => r.json())
			.then((data) => setArchivedItems(data.archivedItems ?? []))
			.finally(() => setLoading(false));
	}, []);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		const res = await fetch("/api/flavor-requests", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(form),
		});
		if (!res.ok) {
			const data = await res.json();
			setError(data.error ?? "Request failed");
			return;
		}
		setSubmitted(true);
		setForm({ item_id: "", customer_email: "", customer_name: "", notes: "" });
	}

	if (loading) {
		return (
			<main style={{ maxWidth: 560, margin: "0 auto", padding: 16 }}>
				<p>Loading...</p>
			</main>
		);
	}

	return (
		<main style={{ maxWidth: 560, margin: "0 auto", padding: 16 }}>
			<Link href="/" style={{ color: "#111827", marginBottom: 16, display: "inline-block" }}>
				← Back to menu
			</Link>
			<h1 style={{ marginBottom: 8 }}>Request a Flavor</h1>
			<p style={{ color: "#6b7280", marginBottom: 24 }}>
				Miss a flavor? Let us know and we&apos;ll consider bringing it back.
			</p>

			{archivedItems.length === 0 ? (
				<p style={{ color: "#6b7280" }}>No archived flavors at the moment. Check back later!</p>
			) : submitted ? (
				<div style={{ padding: 16, background: "#f0fdf4", borderRadius: 8, border: "1px solid #86efac" }}>
					<p style={{ margin: 0, color: "#166534" }}>Thanks! We&apos;ll let you know when this flavor returns.</p>
					<button
						type="button"
						onClick={() => setSubmitted(false)}
						style={{ marginTop: 12, padding: "8px 12px", borderRadius: 8, border: "1px solid #111827" }}
					>
						Request another
					</button>
				</div>
			) : (
				<form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
					<label>
						<div style={{ marginBottom: 4 }}>Flavor</div>
						<select
							value={form.item_id}
							onChange={(e) => setForm((f) => ({ ...f, item_id: e.target.value }))}
							required
							style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #e5e7eb" }}
						>
							<option value="">Select a flavor</option>
							{archivedItems.map((i) => (
								<option key={i.id} value={i.id}>
									{i.name}
								</option>
							))}
						</select>
					</label>
					<label>
						<div style={{ marginBottom: 4 }}>Your email *</div>
						<input
							type="email"
							value={form.customer_email}
							onChange={(e) => setForm((f) => ({ ...f, customer_email: e.target.value }))}
							required
							style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #e5e7eb" }}
						/>
					</label>
					<label>
						<div style={{ marginBottom: 4 }}>Your name (optional)</div>
						<input
							type="text"
							value={form.customer_name}
							onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))}
							style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #e5e7eb" }}
						/>
					</label>
					<label>
						<div style={{ marginBottom: 4 }}>Notes (optional)</div>
						<textarea
							value={form.notes}
							onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
							rows={3}
							style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #e5e7eb" }}
						/>
					</label>
					{error && <p style={{ color: "#dc2626", margin: 0 }}>{error}</p>}
					<button
						type="submit"
						style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #111827", background: "#111827", color: "#fff" }}
					>
						Notify me when it&apos;s back
					</button>
				</form>
			)}
		</main>
	);
}
