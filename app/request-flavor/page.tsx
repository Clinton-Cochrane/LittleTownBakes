"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArchivedFlavorCard, type ArchivedItem } from "@/components/menu/ArchivedFlavorCard";


export default function RequestFlavorPage() {
	const [archivedItems, setArchivedItems] = useState<ArchivedItem[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetch("/api/menu")
			.then((response) => response.json())
			.then((data) => setArchivedItems(data.archivedItems ?? []))
			.finally(() => setLoading(false));
	}, []);

	return (
		<main className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
			<Link href="/" className="mb-6 inline-block text-cocoa transition-colors hover:text-honey">← Back to menu</Link>
			<h1 className="mb-2 font-display text-3xl font-semibold text-cocoa">Past Flavors</h1>
			<p className="mb-8 text-sage">Flavors we&apos;ve retired. Miss one? Send the baker a quick anonymous signal.</p>

			{loading ? <p className="text-sage">Loading...</p> : archivedItems.length === 0 ? (
				<p className="text-sage">No past flavors at the moment. Check back later!</p>
			) : (
				<div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
					{archivedItems.map((item) => <ArchivedFlavorCard key={item.id} item={item} />)}
				</div>
			)}
		</main>
	);
}
