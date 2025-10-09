//components/menu/MenuSection.tsx
import type { Section, Item } from "@/lib/menuCatalog";
import MenuCard from "./MenuCard";

type Props = {
	section: Section;
	isItemAvailable: (item: Item) => boolean;
	formatCurrency: (n: number) => string;
	onAddToCart: (p: { itemId: string; name: string; unitPrice: number; qty: number }) => void;
	getQty: (id: string) => number;
	onSetQty: (p: { itemId: string; name: string; unitPrice: number; qty: number }) => void;
};

export default function MenuSection({ ...props }: Props) {
	const { category, items } = props.section;

	return (
		<section aria-labelledby={`cat-${category.id}`} style={{ margin: "24px 0" }}>
			<h2 id={`cat-${category.id}`} style={{ marginBottom: 12 }}>
				{category.name}
			</h2>

			<div
				style={{
					display: "grid",
					gridTemplateColumns: "1fr",
					gap: 16,
				}}
			>
				<style>{`
                    @media(min-width: 768px) {
                        .menu-grid-${category.id}{
                        display:grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 16px;
                        }
                    }
                    `}</style>
				<div className={`menu-grid-$[category.id]`}>
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
								onAdd={() => props.onAddToCart({ itemId: it.id, name: it.name, unitPrice: it.basePrice, qty: 1 })}
								onSetQty={(newQty: number) =>
									props.onSetQty({ itemId: it.id, name: it.name, unitPrice: it.basePrice, qty: newQty })
								}
							/>
						);
					})}
				</div>
			</div>
		</section>
	);
}
