import { DemandSignalButton } from "./DemandSignalButton";

export type ArchivedItem = { id: string; name: string; description?: string; image?: string };

export function ArchivedFlavorCard({ item }: { item: ArchivedItem }) {
	return (
		<article className="flex flex-col gap-5 rounded-card border border-crust bg-wheat p-5 shadow-soft sm:p-6">
			<div className="aspect-square w-full overflow-hidden rounded-lg bg-cream">
				{/* eslint-disable-next-line @next/next/no-img-element */}
				{item.image ? <img src={item.image} alt="" className="h-full w-full object-cover" /> : null}
			</div>
			<div>
				<h2 className="font-display text-lg font-semibold text-cocoa">{item.name}</h2>
				{item.description && <p className="mt-1 line-clamp-2 text-sm text-sage">{item.description}</p>}
			</div>
			<DemandSignalButton productId={item.id} label="Bring this back" className="btn-secondary w-full" />
		</article>
	);
}
