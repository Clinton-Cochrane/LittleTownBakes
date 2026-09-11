"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import CartSheet from "./cart/CartSheet";
import { useCart } from "./cart/useCart";
import { usePathname, useRouter } from "next/navigation";
import { HomeNavIcon, MenuNavIcon, PastFlavorsNavIcon } from "@/components/icons/navIcons";
import ShoppingBagIcon from "@/components/icons/ShoppingBagIcon";
import { BRAND } from "@/lib/brand";

const navLinkClass =
	"inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-2 py-2 text-sm font-semibold transition-colors hover:bg-powder-mist hover:text-accent md:px-4";

const navItems = [
	{ href: "/", label: "Home", Icon: HomeNavIcon },
	{ href: "/menu", label: "Menu", Icon: MenuNavIcon },
	{ href: "/request-flavor", label: "Past flavors", Icon: PastFlavorsNavIcon },
] as const;

export default function Header() {
	const [open, setOpen] = useState(false);
	const [showLogo, setShowLogo] = useState(true);
	const { items } = useCart();
	const router = useRouter();
	const pathname = usePathname();
	const count = useMemo(() => items.reduce((n, i) => n + i.qty, 0), [items]);

	return (
		<header className="border-b border-powder bg-gradient-to-b from-cream via-parchment to-wheat shadow-soft">
			<div className="mx-auto max-w-6xl px-4 py-3 sm:px-6 sm:py-4">
				<div className="flex justify-center sm:justify-start">
					<Link
						href="/"
						className="group inline-flex min-w-0 items-center gap-3 rounded-lg text-left text-cocoa hover:text-cocoa"
					>
						{showLogo && (
							<Image
								src={BRAND.logo.src}
								alt={BRAND.logo.alt}
								width={64}
								height={64}
								unoptimized
								onError={() => setShowLogo(false)}
								className="h-12 w-12 shrink-0 object-contain sm:h-14 sm:w-14"
							/>
						)}
						<span className="min-w-0">
							<span className="block font-display text-xl font-semibold tracking-tight sm:text-2xl md:text-[1.7rem]">
								{BRAND.name}
							</span>
							<span className="mt-0.5 block text-xs font-medium text-muted sm:text-sm">
								{BRAND.tagline}
							</span>
						</span>
					</Link>
				</div>
			</div>

			<nav
				className="border-t border-powder/70 bg-gradient-to-r from-powder-mist/75 via-peach-mist/55 to-powder/35"
				aria-label="Primary"
			>
				<div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-2 py-2 sm:px-4 md:px-6">
					<div className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-1 sm:justify-start md:gap-2 lg:gap-3">
						{navItems.map(({ href, label, Icon }) => {
							const isCurrent = href === "/" ? pathname === href : pathname.startsWith(href);

							return (
								<Link
									key={href}
									href={href}
									aria-current={isCurrent ? "page" : undefined}
									className={`${navLinkClass} ${isCurrent ? "bg-powder text-cocoa shadow-soft" : "text-cocoa"}`}
								>
									<span className="hidden lg:inline" aria-hidden>
										<Icon className={isCurrent ? "text-accent" : "text-caramel"} size={19} />
									</span>
									{label}
								</Link>
							);
						})}
					</div>
					<div className="flex shrink-0 justify-center sm:justify-end">
						<button
							type="button"
							onClick={() => setOpen(true)}
							aria-label={`Open cart (${count} items)`}
							className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-crust bg-cream/95 px-3 py-2 text-sm font-semibold text-cocoa shadow-soft transition-colors hover:border-powder hover:bg-powder-mist hover:text-cocoa md:px-4"
						>
							<span className="hidden md:inline" aria-hidden>
								<ShoppingBagIcon className="text-caramel" size={19} />
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
