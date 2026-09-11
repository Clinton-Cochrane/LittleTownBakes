import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const dataDirectory = path.join(process.cwd(), ".local");
const dataFile = path.join(dataDirectory, "data.json");
const ifMissing = process.argv.includes("--if-missing");

if (ifMissing) {
	try {
		await readFile(dataFile);
		process.exit(0);
	} catch {
		// Generate the missing file below.
	}
}

const now = new Date();
const createdAt = now.toISOString();
const startOne = new Date(now.getTime() + 24 * 60 * 60 * 1000);
startOne.setUTCHours(18, 0, 0, 0);
const startTwo = new Date(startOne.getTime() + 24 * 60 * 60 * 1000);
const endOne = new Date(startOne.getTime() + 60 * 60 * 1000);
const endTwo = new Date(startTwo.getTime() + 60 * 60 * 1000);
const pickupOne = "11111111-1111-4111-8111-111111111111";
const pickupTwo = "22222222-2222-4222-8222-222222222222";

const data = {
	categories: [
		{ id: "cake-pops", name: "Cake Pops", sort_order: 10, created_at: createdAt, updated_at: createdAt },
		{ id: "cookies", name: "Cookies", sort_order: 20, created_at: createdAt, updated_at: createdAt },
	],
	products: [
		{ id: "birthday-cake-pop", category_id: "cake-pops", name: "Birthday Cake Pop", description: "Vanilla cake with rainbow sprinkles.", price_cents: 250, image: "/img/cakepop_vanilla.png", max_per_order: 12, is_archived: false, sort_order: 10, created_at: createdAt, updated_at: createdAt },
		{ id: "chocolate-cake-pop", category_id: "cake-pops", name: "Chocolate Cake Pop", description: "Chocolate cake dipped in dark chocolate.", price_cents: 250, image: "/img/cakepop_chocolate.png", max_per_order: 12, is_archived: false, sort_order: 20, created_at: createdAt, updated_at: createdAt },
		{ id: "chocolate-chip-cookie", category_id: "cookies", name: "Chocolate Chip Cookie", description: "A chewy cookie with chocolate chips.", price_cents: 200, image: "/img/cookie_chocolatechip.png", max_per_order: 24, is_archived: false, sort_order: 30, created_at: createdAt, updated_at: createdAt },
		{ id: "snickerdoodle-cookie", category_id: "cookies", name: "Snickerdoodle Cookie", description: "A sold-out cinnamon-sugar cookie.", price_cents: 200, image: "/img/cookie_snickerdoodle.png", max_per_order: 24, is_archived: false, sort_order: 40, created_at: createdAt, updated_at: createdAt },
		{ id: "red-velvet-cake-pop", category_id: "cake-pops", name: "Red Velvet Cake Pop", description: "A past flavor.", price_cents: 275, image: "/img/cupcake_redvelvet.png", max_per_order: 12, is_archived: true, sort_order: 50, created_at: createdAt, updated_at: createdAt },
	],
	inventory: [
		{ product_id: "birthday-cake-pop", quantity_on_hand: 8 },
		{ product_id: "chocolate-cake-pop", quantity_on_hand: 4 },
		{ product_id: "chocolate-chip-cookie", quantity_on_hand: 12 },
		{ product_id: "snickerdoodle-cookie", quantity_on_hand: 0 },
		{ product_id: "red-velvet-cake-pop", quantity_on_hand: 0 },
	],
	pickupWindows: [
		{ id: pickupOne, start_at: startOne.toISOString(), end_at: endOne.toISOString(), enabled: true, created_at: createdAt, updated_at: createdAt },
		{ id: pickupTwo, start_at: startTwo.toISOString(), end_at: endTwo.toISOString(), enabled: true, created_at: createdAt, updated_at: createdAt },
	],
	orders: [],
	demandSignals: {},
};

await mkdir(dataDirectory, { recursive: true });
await writeFile(dataFile, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Reset local data: ${dataFile}`);
console.log("Local admin: root@local.test / toor");
