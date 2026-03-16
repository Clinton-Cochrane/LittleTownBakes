import "./globals.css"
import { DM_Sans, Fraunces } from "next/font/google"
import Header from "@/components/header";
import { CartProvider } from "@/components/cart/useCart";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" className={`${dmSans.variable} ${fraunces.variable}`}>
			<body className="min-h-screen bg-cream text-cocoa font-body antialiased">
				<CartProvider>
					<Header />
					<main className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6">{children}</main>
				</CartProvider>
			</body>
		</html>
	);
}
