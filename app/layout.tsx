import "./globals.css"
import { DM_Sans, Fraunces } from "next/font/google"
import type { Metadata } from "next";
import Header from "@/components/header";
import { CartProvider } from "@/components/cart/useCart";
import { BRAND } from "@/lib/brand";

const dmSans = DM_Sans({
	subsets: ["latin"],
	variable: "--font-dm-sans",
	display: "swap",
});
const fraunces = Fraunces({
	subsets: ["latin"],
	variable: "--font-fraunces",
	display: "swap",
});

export const metadata: Metadata = {
	title: {
		default: BRAND.name,
		template: `%s | ${BRAND.name}`,
	},
	description: `${BRAND.tagline} ${BRAND.description}`,
	icons: { icon: BRAND.favicon },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" className={`${dmSans.variable} ${fraunces.variable}`}>
			<body className="min-h-screen bg-gradient-to-b from-parchment via-cream to-peach-mist/40 font-body text-cocoa antialiased">
				<CartProvider>
					<Header />
					<main className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6">{children}</main>
				</CartProvider>
			</body>
		</html>
	);
}
