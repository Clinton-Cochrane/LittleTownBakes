"use client";

import { useEffect } from "react";

/**
 * Placeholder for shop-wide configuration (payment display, email templates, notifications, etc.).
 * Forms and persistence will be added after requirements are finalized with the client.
 */
export default function AdminSettingsPage() {
	useEffect(() => {
		const key = sessionStorage.getItem("admin_key") ?? "";
		if (!key) {
			window.location.href = "/admin/login";
		}
	}, []);

	return (
		<main className="mx-auto max-w-4xl px-4 py-6">
			<h1 className="mb-2 font-display text-2xl font-semibold text-cocoa">Settings</h1>
			<p className="mb-6 max-w-2xl text-sm text-sage">
				Shop configuration will live here once you decide what the bakery needs in the app—for example how
				payment instructions appear to customers, contact email, or notification preferences. Nothing is
				configurable on this page yet.
			</p>

			<section
				className="rounded-xl border border-amber-200/80 bg-cream/40 px-4 py-5 text-sm text-cocoa/90"
				aria-labelledby="settings-planned-heading"
			>
				<h2 id="settings-planned-heading" className="mb-3 font-medium text-cocoa">
					Likely areas to define with your client
				</h2>
				<ul className="list-inside list-disc space-y-2 text-sage">
					<li>Payment and checkout copy (Venmo handle, instructions, pickup notes)</li>
					<li>Email addresses and who receives order or flavor-request notifications</li>
					<li>Any future integrations (e.g. transactional email, SMS)</li>
				</ul>
			</section>
		</main>
	);
}
