import Link from "next/link";
import { useCart } from "./useCart";

export default function CartDropdown() {
	const { items } = useCart();

	if (items.length === 0) {
		return (
			<div className="absolute right-0 mt-2 p-4 bg-white shadow rounded">
				<p>your cart is empty; let&#39;s fill it up</p>
				<Link href="/" className="text-blue-500 underline">
					View Menu
				</Link>
			</div>
		);
	}

	return (
		<div className="absolute right-0 mt-2 p-4 bg-white shadow rounded w-64">
			<ul>
				{items.map((items, index) => (
					<li key={index} className="mb-2">
						{items.name} - ${items.price}
					</li>
				))}
			</ul>
			<a href="/cart" className="block mt-2 text-blue-600 underline">
				Review Order
			</a>
		</div>
	);
}
