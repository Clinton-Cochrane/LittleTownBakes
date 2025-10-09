import Header from "@/components/header";
import { CartProvider } from "@/components/cart/useCart";

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body>
				<CartProvider>
					<Header />
					<main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
				</CartProvider>
			</body>
		</html>
	);
}
