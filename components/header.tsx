"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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
		<header className="flex items-center justify-between gap-4 border-b border-crust bg-wheat px-4 py-3 sm:px-6">
			<div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-6">
				<Link href="/" className="font-display text-lg font-semibold text-cocoa transition-colors hover:text-honey sm:text-xl shrink-0">
					Little Town Bakes
				</Link>
				<Link href="/about" className="whitespace-nowrap text-xs text-cocoa underline-offset-2 transition-colors hover:text-honey hover:underline sm:text-sm">
					About
				</Link>
				<Link href="/request-flavor" className="whitespace-nowrap text-xs text-cocoa underline-offset-2 transition-colors hover:text-honey hover:underline sm:text-sm">
					Past flavors
				</Link>
			</div>
			<button
				onClick={() => setOpen(true)}
				aria-label={`Open Cart (${count} items)`}
				className="rounded-lg p-2 text-cocoa transition-colors hover:bg-cream hover:text-honey focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-honey"
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
