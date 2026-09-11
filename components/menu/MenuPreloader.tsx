"use client";

import { useEffect } from "react";
import { preloadMenu } from "@/lib/menuLoader";

export default function MenuPreloader() {
	useEffect(() => {
		preloadMenu();
	}, []);

	return null;
}
