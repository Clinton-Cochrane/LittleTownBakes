import { ArchivedFlavorCard, type ArchivedItem } from "@/components/menu/ArchivedFlavorCard";
import { loadMenuCatalog } from "@/lib/loadMenuCatalog";

type PastFlavorsContentProps = {
	archivedItems: ArchivedItem[];
	loading: boolean;
	error: string | null;
};

export async function loadArchivedFlavors(fetchMenu: typeof fetch = fetch): Promise<ArchivedItem[]> {
	const menu = await loadMenuCatalog(fetchMenu);
	return menu.archivedItems;
}

export function PastFlavorsContent({
	archivedItems,
	loading,
	error,
}: PastFlavorsContentProps) {
	if (loading) {
		return <p role="status" aria-busy="true" className="text-sage">Loading past flavors...</p>;
	}

	if (error) {
		return (
			<div role="alert" className="rounded-lg border border-crust bg-wheat p-6 text-cocoa">
				<p className="font-display text-lg font-semibold">Past flavors are temporarily unavailable.</p>
				<p className="mt-2 text-sm text-sage">{error}</p>
			</div>
		);
	}

	if (archivedItems.length === 0) {
		return <p className="text-sage">No past flavors at the moment. Check back later!</p>;
	}

	return (
		<div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
			{archivedItems.map((item) => <ArchivedFlavorCard key={item.id} item={item} />)}
		</div>
	);
}
