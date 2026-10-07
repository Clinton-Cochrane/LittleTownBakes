import "./globals.css"
import { DM_Sans, Fraunces } from "next/font/google"
import type { Metadata } from "next";
import Header from "@/components/header";
import { CartProvider } from "@/components/cart/useCart";
import { BRAND } from "@/lib/brand";
import { getSiteOrigin, SITE } from "@/lib/seo";

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
	metadataBase: getSiteOrigin(),
	title: {
		default: BRAND.name,
		template: `%s | ${BRAND.name}`,
	},
	description: SITE.description,
	applicationName: SITE.name,
	icons: { icon: BRAND.favicon },
	robots: { index: true, follow: true },
	openGraph: {
		type: "website",
		locale: "en_US",
		siteName: SITE.name,
		title: SITE.name,
		description: SITE.description,
	},
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
