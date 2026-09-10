"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ArchivedItem } from "@/components/menu/ArchivedFlavorCard";
import { loadArchivedFlavors, PastFlavorsContent } from "./PastFlavorsContent";

export default function RequestFlavorPage() {
	const [archivedItems, setArchivedItems] = useState<ArchivedItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let alive = true;

		(async () => {
			try {
				const items = await loadArchivedFlavors();
				if (alive) setArchivedItems(items);
			} catch (loadError) {
				if (!alive) return;
				setError(
					loadError instanceof Error
						? loadError.message
						: "Menu is currently unavailable. Please try again later."
				);
			} finally {
				if (alive) setLoading(false);
			}
		})();

		return () => {
			alive = false;
		};
	}, []);

	return (
		<main className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
			<Link href="/" className="mb-6 inline-block text-cocoa transition-colors hover:text-honey">← Back to menu</Link>
			<h1 className="mb-2 font-display text-3xl font-semibold text-cocoa">Past Flavors</h1>
			<p className="mb-8 text-sage">Flavors we&apos;ve retired. Miss one? Send the baker a quick anonymous signal.</p>

			<PastFlavorsContent archivedItems={archivedItems} loading={loading} error={error} />
		</main>
	);
}
