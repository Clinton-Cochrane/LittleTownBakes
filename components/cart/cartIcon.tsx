import { useCart } from "./useCart";
import ShoppingBagIcon from "@/components/icons/ShoppingBagIcon";

export default function CartIcon() {
	const { items, hydrated } = useCart();
	const count = hydrated ? items.reduce((n, i) => n + i.qty, 0) : 0;

	return (
		<div className="relative" suppressHydrationWarning>
			<ShoppingBagIcon size={24} className="text-current" />
			{count > 0 && (
				<span className="absolute -top-1.5 -right-1.5 flex min-w-[1.25rem] items-center justify-center rounded-full bg-berry px-1.5 py-0.5 text-xs font-medium text-white">
					{count}
				</span>
			)}
		</div>
	);
}
