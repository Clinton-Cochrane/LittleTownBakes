"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import CartSheet from "./cart/CartSheet";
import { useCart } from "./cart/useCart";
import { useRouter } from "next/navigation";
import { AboutNavIcon, MenuNavIcon, PastFlavorsNavIcon } from "@/components/icons/navIcons";

const navLinkClass =
	"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium text-cocoa transition-colors hover:bg-amber-50/80 hover:text-caramel md:px-4";

export default function Header() {
	const [open, setOpen] = useState(false);
	const { items } = useCart();
	const router = useRouter();
	const count = useMemo(() => items.reduce((n, i) => n + i.qty, 0), [items]);

	return (
		<header className="border-b border-amber-200/80 bg-gradient-to-b from-amber-50/95 via-parchment to-wheat shadow-soft">
			<div className="mx-auto max-w-6xl px-4 pt-4 pb-0 sm:px-6 sm:pt-5">
				<div className="text-center sm:text-left">
					<Link
						href="/"
						className="font-display text-xl font-semibold tracking-tight text-cocoa transition-colors hover:text-caramel sm:text-2xl md:text-[1.65rem]"
					>
						Hometown Cottage Bakery
					</Link>
					<p className="mt-1 font-body text-xs text-caramel/90 sm:text-sm">Little Town Bakes</p>
				</div>
			</div>

			<nav
				className="mt-3 border-t border-amber-200/70 bg-gradient-to-r from-amber-100/40 via-peach-mist/50 to-sage/15"
				aria-label="Primary"
			>
				<div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-2 py-2 sm:px-4 sm:py-3 md:px-6">
					<div className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-1 sm:justify-start md:gap-2 lg:gap-3">
						<Link href="/" className={navLinkClass}>
							<span className="hidden md:inline" aria-hidden>
								<MenuNavIcon className="text-caramel" size={20} />
							</span>
							Menu
						</Link>
						<Link href="/about" className={navLinkClass}>
							<span className="hidden md:inline" aria-hidden>
								<AboutNavIcon className="text-caramel" size={20} />
							</span>
							About
						</Link>
						<Link href="/request-flavor" className={navLinkClass}>
							<span className="hidden md:inline" aria-hidden>
								<PastFlavorsNavIcon className="text-caramel" size={20} />
							</span>
							Past flavors
						</Link>
					</div>
					<div className="flex shrink-0 justify-center sm:justify-end">
						<button
							type="button"
							onClick={() => setOpen(true)}
							aria-label={`Open cart (${count} items)`}
							className="inline-flex items-center gap-2 rounded-lg border border-crust/80 bg-cream/90 px-3 py-2.5 text-sm font-medium text-cocoa shadow-soft transition-colors hover:border-honey hover:bg-wheat hover:text-caramel focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-honey md:px-4"
						>
							<span className="hidden md:inline" aria-hidden>
								<svg
									width={20}
									height={20}
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									className="text-caramel"
								>
									<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
									<line x1="3" y1="6" x2="21" y2="6" />
									<path d="M16 10a4 4 0 0 1-8 0" />
								</svg>
							</span>
							Cart
							{count > 0 && (
								<span className="rounded-full bg-berry px-2 py-0.5 text-xs font-semibold text-white">
									{count}
								</span>
							)}
						</button>
					</div>
				</div>
			</nav>

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
