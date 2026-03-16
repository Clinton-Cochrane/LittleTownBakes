import type { Section, Item } from "@/lib/menuCatalog";
import MenuCard from "./MenuCard";

type Props = {
	section: Section;
	isItemAvailable: (item: Item) => boolean;
	formatCurrency: (n: number) => string;
	onAddToCart: (p: {
		itemId: string;
		name: string;
		unitPrice: number;
		qty: number;
		image?: string;
		categoryId?: string;
		categoryName?: string;
		maxPerOrder?: number;
	}) => void;
	getQty: (id: string) => number;
	onSetQty: (p: {
		itemId: string;
		name: string;
		unitPrice: number;
		qty: number;
		image?: string;
		categoryId?: string;
		categoryName?: string;
		maxPerOrder?: number;
	}) => void;
};

export default function MenuSection({ ...props }: Props) {
	const { category, items } = props.section;

	return (
		<section aria-labelledby={`cat-${category.id}`} className="my-10 sm:my-12">
			<h2 id={`cat-${category.id}`} className="mb-6 font-display text-xl font-semibold text-cocoa sm:text-2xl">
				{category.name}
			</h2>

			<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:gap-6">
				{items.map((it) => {
					const qty = props.getQty(it.id);
					const max = it.maxPerOrder ?? 99;
					return (
						<MenuCard
							key={it.id}
							item={it}
							available={props.isItemAvailable(it)}
							formatCurrency={props.formatCurrency}
							qty={qty}
							maxPerOrder={max}
							onAdd={() =>
								props.onAddToCart({
									itemId: it.id,
									name: it.name,
									unitPrice: it.basePrice,
									qty: 1,
									image: it.image,
									categoryId: it.categoryId,
									categoryName: props.section.category.name,
									maxPerOrder: it.maxPerOrder,
								})
							}
							onSetQty={(newQty: number) =>
								props.onSetQty({
									itemId: it.id,
									name: it.name,
									unitPrice: it.basePrice,
									qty: newQty,
									image: it.image,
									categoryId: it.categoryId,
									categoryName: props.section.category.name,
									maxPerOrder: it.maxPerOrder,
								})
							}
						/>
					);
				})}
			</div>
		</section>
	);
}
