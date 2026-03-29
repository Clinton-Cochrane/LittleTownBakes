"use client";

import { useEffect, useState } from "react";
import { ChatNavIcon } from "@/components/icons/navIcons";

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

/** Internal DB values — UI labels explain intent (no automatic customer email yet). */
const STATUS_LABELS: Record<(typeof STATUS_OPTIONS)[number], { title: string; description: string }> = {
	pending: {
		title: "New",
		description: "You have not marked this request handled yet.",
	},
	notified: {
		title: "Acknowledged",
		description:
			"You have followed up (e.g. replied by email or told the customer). This is a manual flag for your records — automated customer notifications are not wired up in the app yet.",
	},
	ignored: {
		title: "Closed",
		description: "No further action planned (e.g. not offering that flavor).",
	},
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
			<main className="mx-auto max-w-3xl px-4 py-6">
				<p className="text-sage">Loading...</p>
			</main>
		);
	}

	return (
		<main className="mx-auto max-w-3xl px-4 py-6">
			<h1 className="mb-2 font-display text-2xl font-semibold text-cocoa">Flavor requests</h1>
			<p className="mb-6 text-sm text-sage">
				When you mark <strong className="font-medium text-cocoa">Acknowledged</strong>, it means{" "}
				<em>you</em> have contacted the customer — the site does not send automatic emails for these yet.
			</p>

			{requests.length === 0 ? (
				<p className="text-sage">No flavor requests yet.</p>
			) : (
				<div className="flex flex-col gap-5">
					{requests.map((r) => (
						<div key={r.id} className="card-warm p-4 sm:p-6">
							<div className="flex flex-wrap items-start justify-between gap-2">
								<div>
									<strong className="text-cocoa">{r.item_id}</strong>
									<span className="mx-2 text-sage">—</span>
									<span className="text-cocoa">{r.customer_email}</span>
									{r.customer_name && <span className="text-sage"> ({r.customer_name})</span>}
								</div>
								<span className="rounded-full bg-crust px-2.5 py-0.5 text-xs font-medium text-caramel">
									{STATUS_LABELS[r.status as keyof typeof STATUS_LABELS]?.title ?? r.status}
								</span>
							</div>
							{r.notes && <div className="mt-3 text-sm text-sage">{r.notes}</div>}

							<div className="mt-5 border-t border-crust pt-4">
								<p className="mb-3 text-xs font-medium uppercase tracking-wide text-sage">Update status</p>
								<div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
									{STATUS_OPTIONS.map((s) => {
										const info = STATUS_LABELS[s];
										const active = r.status === s;
										return (
											<button
												key={s}
												type="button"
												onClick={() => setStatus(r.id, s)}
												className={`flex flex-1 flex-col items-start gap-0.5 rounded-button border px-3 py-2.5 text-left text-sm transition-colors sm:min-w-[140px] sm:flex-none ${
													active
														? "border-caramel bg-honey text-white"
														: "border-crust bg-cream text-cocoa hover:border-honey hover:bg-wheat"
												}`}
											>
												<span className="flex items-center gap-2 font-semibold">
													<span className={active ? "text-white" : "text-caramel"} aria-hidden>
														<ChatNavIcon className={active ? "text-white" : "text-caramel"} size={16} />
													</span>
													{info.title}
												</span>
												<span
													className={`text-xs leading-snug ${active ? "text-white/90" : "text-sage"}`}
												>
													{info.description}
												</span>
											</button>
										);
									})}
								</div>
							</div>
						</div>
					))}
				</div>
			)}
		</main>
	);
}
