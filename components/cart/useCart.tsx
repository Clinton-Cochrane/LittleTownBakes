"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type CartItem = {
	id: string;
	name: string;
	price: number;
	qty: number;
	image?: string;
	categoryId?: string;
	categoryName?: string;
	maxPerOrder?: number;
};

type CartContextValue = {
	items: CartItem[];
	hydrated: boolean;
	addItem: (item: CartItem) => void;
	removeItem: (id: string) => void;
	clearCart: () => void;
	getQty: (id: string) => number; // always a number
	setQty: (id: string, qty: number) => void; // 0 removes; no auto-create
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "cb_cart_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
	const [items, setItems] = useState<CartItem[]>([]);
	const [hydrated, setHydrated] = useState(false);

	//hydrate
	useEffect(() => {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (raw) {
				const parsed = JSON.parse(raw) as CartItem[];
				if (Array.isArray(parsed)) setItems(parsed);
			}
		} catch (e) {
			console.warn("[cart] parse error:", e);
		} finally {
			setHydrated(true);
		}
	}, []);

	//persist
	useEffect(() => {
		if (!hydrated) return;
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
		} catch (e) {
			console.warn("[cart] warn error: ", e);
		}
	}, [items, hydrated]);

	//cross-tab sync
	useEffect(() => {
		const handler = (e: StorageEvent) => {
			if (e.key !== STORAGE_KEY) return;
			try {
				const next = e.newValue ? (JSON.parse(e.newValue) as CartItem[]) : [];
				if (Array.isArray(next)) setItems(next);
			} catch {}
		};
		window.addEventListener("storage", handler);
		return () => window.removeEventListener("storage", handler);
	}, []);

	const addItem = useCallback((incoming: CartItem) => {
		setItems((prev) => {
			const idx = prev.findIndex((i) => i.id === incoming.id);
			if (idx === -1) return [...prev, incoming];
			const copy = [...prev];
			copy[idx] = { ...copy[idx], qty: copy[idx].qty + incoming.qty };
			return copy;
		});
	}, []);

	const removeItem = useCallback((id: string) => {
		setItems((prev) => prev.filter((i) => i.id !== id));
	}, []);

	const clearCart = useCallback(() => setItems([]), []);

	const getQty = useCallback(
		(id: string) => {
			const found = items.find((i) => i.id === id);
			return found?.qty ?? 0;
		},
		[items]
	);

	const setQty = useCallback((id: string, qty: number) => {
		setItems((prev) => {
			if (qty <= 0) return prev.filter((i) => i.id !== id);
			const idx = prev.findIndex((i) => i.id === id);
			if (idx === -1) return prev; // ✅ do not auto-create; caller should add first
			const copy = [...prev];
			copy[idx] = { ...copy[idx], qty };
			return copy;
		});
	}, []);

	const value = useMemo(
		() => ({ items, hydrated, addItem, removeItem, clearCart, getQty, setQty }),
		[items, hydrated, addItem, removeItem, clearCart, getQty, setQty]
	);

	return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
	const ctx = useContext(CartContext);
	if (!ctx) throw new Error("useCart must be used within Cart Provider");
	return ctx;
}
