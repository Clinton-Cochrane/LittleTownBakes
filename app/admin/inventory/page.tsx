"use client";

import { useEffect } from "react";

/**
 * Redirect from legacy /admin/inventory to /admin/availability.
 * Keeps old bookmarks and links working.
 */
export default function AdminInventoryRedirect() {
	useEffect(() => {
		window.location.replace("/admin/availability");
	}, []);
	return (
		<main className="mx-auto max-w-3xl px-4 py-6">
			<p className="text-sage">Redirecting...</p>
		</main>
	);
}
