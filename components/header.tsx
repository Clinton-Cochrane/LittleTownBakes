"use client";

import { useMemo, useState } from "react";
import CartIcon from "./cart/cartIcon";
import CartSheet from "./cart/CartSheet";
import { useCart } from "./cart/useCart";
import { useRouter } from "next/navigation";

export default function Header() {
	const [open, setOpen] = useState(false);
	const { items } = useCart();
	const router = useRouter();
	const count = useMemo(() => items.reduce((n, i) => n + i.qty, 0), [items]);

	return (
		<header className="flex items-center justify-between px-4 py-2 shadow bg-[#abd2ff] text-white">
			<h1 className="text-lg font-semibold">Cottage Bakery</h1>
			<button
				onClick={() => setOpen(true)}
				aria-label={`Open Cart (${count} items)`}
				style={{ background: "transparent", border: "none", cursor: "pointer" }}
			>
				<CartIcon />
			</button>

			<CartSheet
				open={open}
				onClose={() => setOpen(false)}
				onCheckout={() => {
					setOpen(false);
					router.push("/checkout");
				}}
			/>
		</header>
	);
}
