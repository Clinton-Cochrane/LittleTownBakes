import "./globals.css"
import Header from "@/components/header";
import { CartProvider } from "@/components/cart/useCart";

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body className="min-h-screen bg-[#e1a6cc99] text-[#5b3b2a] font-sans">
				<CartProvider>
					<Header />
					<main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
				</CartProvider>
			</body>
		</html>
	);
}
