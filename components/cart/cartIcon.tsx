import { useCart } from "./useCart";

export default function CartIcon() {
	const { items, hydrated } = useCart();
	const count = hydrated ? items.reduce((n, i) => n + i.qty, 0): 0;

	return (
		<div className="relative" suppressHydrationWarning>
			<span>🛒</span>
			{count > 0 && (
				<span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full px-2 text-xs" style={{position:"absolute"}}>{count}</span>
			)}
		</div>
	);
}
