"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ArchivedItem = {
	id: string;
	name: string;
	description?: string;
	image?: string;
	basePrice?: number;
};

export default function RequestFlavorPage() {
	const [archivedItems, setArchivedItems] = useState<ArchivedItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [requestingId, setRequestingId] = useState<string | null>(null);
	const [form, setForm] = useState({
		customer_email: "",
		customer_name: "",
		notes: "",
	});
	const [error, setError] = useState<string | null>(null);
	const [submitted, setSubmitted] = useState<string | null>(null);

	useEffect(() => {
		fetch("/api/menu")
			.then((r) => r.json())
			.then((data) => setArchivedItems(data.archivedItems ?? []))
			.finally(() => setLoading(false));
	}, []);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!requestingId) return;
		setError(null);
		const res = await fetch("/api/flavor-requests", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				item_id: requestingId,
				customer_email: form.customer_email,
				customer_name: form.customer_name,
				notes: form.notes,
			}),
		});
		if (!res.ok) {
			const data = await res.json();
			setError(data.error ?? "Request failed");
			return;
		}
		setSubmitted(requestingId);
		setRequestingId(null);
		setForm({ customer_email: "", customer_name: "", notes: "" });
	}

	function openRequest(itemId: string) {
		setRequestingId(itemId);
		setError(null);
		setSubmitted(null);
	}

	if (loading) {
		return (
			<main className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
				<p className="text-sage">Loading...</p>
			</main>
		);
	}

	return (
		<main className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
			<Link href="/" className="mb-6 inline-block text-cocoa transition-colors hover:text-honey">
				← Back to menu
			</Link>
			<h1 className="mb-2 font-display text-3xl font-semibold text-cocoa">Past Flavors</h1>
			<p className="mb-8 text-sage">
				Flavors we&apos;ve retired. Loved one? Let us know and we&apos;ll consider bringing it back.
			</p>

			{archivedItems.length === 0 ? (
				<p className="text-sage">No past flavors at the moment. Check back later!</p>
			) : (
				<div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
					{archivedItems.map((item) => (
						<article
							key={item.id}
							className="flex flex-col gap-5 rounded-card border border-crust bg-wheat p-5 shadow-soft sm:p-6"
						>
							<div className="aspect-square w-full overflow-hidden rounded-lg bg-cream">
								{item.image ? (
									/* eslint-disable-next-line @next/next/no-img-element */
									<img src={item.image} alt="" className="h-full w-full object-cover" />
								) : null}
							</div>
							<div>
								<h3 className="font-display text-lg font-semibold text-cocoa">{item.name}</h3>
								{item.description && (
									<p className="mt-1 line-clamp-2 text-sm text-sage">{item.description}</p>
								)}
							</div>
							{requestingId === item.id ? (
								<form onSubmit={handleSubmit} className="flex flex-col gap-3">
									<input
										type="email"
										placeholder="Your email *"
										value={form.customer_email}
										onChange={(e) => setForm((f) => ({ ...f, customer_email: e.target.value }))}
										required
										className="input-base"
									/>
									<input
										type="text"
										placeholder="Your name (optional)"
										value={form.customer_name}
										onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))}
										className="input-base"
									/>
									<textarea
										placeholder="Notes (optional)"
										value={form.notes}
										onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
										rows={2}
										className="input-base resize-y"
									/>
									{error && <p className="text-sm text-berry">{error}</p>}
									<div className="flex gap-2">
										<button type="submit" className="btn-primary flex-1">
											Submit
										</button>
										<button
											type="button"
											onClick={() => {
												setRequestingId(null);
												setError(null);
											}}
											className="btn-secondary"
										>
											Cancel
										</button>
									</div>
								</form>
							) : submitted === item.id ? (
								<div className="rounded-lg border border-success/40 bg-success/10 px-4 py-3 text-sm text-success">
									Thanks! We&apos;ll let you know when it returns.
								</div>
							) : (
								<button
									type="button"
									onClick={() => openRequest(item.id)}
									className="btn-secondary w-full text-center"
								>
									I loved this — think about returning it in circulation
								</button>
							)}
						</article>
					))}
				</div>
			)}
		</main>
	);
}
