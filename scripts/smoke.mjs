import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:net";

const HOST = "127.0.0.1";
const START_TIMEOUT_MS = 30_000;
const REQUEST_TIMEOUT_MS = 5_000;
const PUBLIC_TITLES = new Map([
	["/", "Bakery in Oakley, CA | Little Town Bakes"],
	["/menu", "Cookies &amp; Bakery Menu | Little Town Bakes"],
	["/request-flavor", "Past Flavors | Little Town Bakes"],
]);
const PRIVATE_ROUTES = ["/checkout", "/orders/seo-smoke-token", "/admin/login", "/admin/menu"];
const ROUTES = [...PUBLIC_TITLES.keys(), ...PRIVATE_ROUTES, "/robots.txt", "/sitemap.xml", "/api/health"];

async function getAvailablePort() {
	const server = createServer();
	server.unref();
	server.listen(0, HOST);
	await once(server, "listening");
	const address = server.address();
	if (!address || typeof address === "string") {
		server.close();
		throw new Error("Could not allocate a local port");
	}
	const { port } = address;
	server.close();
	await once(server, "close");
	return port;
}

function delay(milliseconds) {
	return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function stopProcess(child) {
	if (child.exitCode !== null || child.signalCode !== null) return;

	if (process.platform !== "win32") {
		process.kill(-child.pid, "SIGTERM");
	} else {
		child.kill("SIGTERM");
	}

	await Promise.race([once(child, "exit"), delay(5_000)]);
	if (child.exitCode === null && child.signalCode === null) {
		if (process.platform !== "win32") {
			process.kill(-child.pid, "SIGKILL");
		} else {
			child.kill("SIGKILL");
		}
		await once(child, "exit");
	}
}

async function request(url) {
	return fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
}

async function waitForServer(baseUrl, child) {
	const deadline = Date.now() + START_TIMEOUT_MS;
	while (Date.now() < deadline) {
		if (child.exitCode !== null) {
			throw new Error(`Next exited before accepting connections (code ${child.exitCode})`);
		}
		try {
			await request(`${baseUrl}/api/health`);
			return;
		} catch {
			await delay(250);
		}
	}
	throw new Error(`Next did not accept connections within ${START_TIMEOUT_MS}ms`);
}

const port = await getAvailablePort();
const baseUrl = `http://${HOST}:${port}`;
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const child = spawn(
	npmCommand,
	["run", "start", "--", "--hostname", HOST, "--port", String(port)],
	{
		stdio: ["ignore", "pipe", "pipe"],
		detached: process.platform !== "win32",
		env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
	},
);

let serverOutput = "";
const canonicals = [];
child.stdout.on("data", (chunk) => {
	serverOutput += chunk;
});
child.stderr.on("data", (chunk) => {
	serverOutput += chunk;
});

try {
	await waitForServer(baseUrl, child);

	for (const route of ROUTES) {
		const response = await request(`${baseUrl}${route}`);
		if (response.status >= 500) {
			throw new Error(`${route} returned unexpected status ${response.status}`);
		}

		if (route === "/api/health") {
			if (!response.ok) {
				throw new Error(`/api/health returned status ${response.status}`);
			}
			const body = await response.json();
			if (body.status !== "ok" || typeof body.timestamp !== "string") {
				throw new Error(`/api/health returned an unexpected liveness response: ${JSON.stringify(body)}`);
			}
		} else {
			assert.equal(response.status, 200, `${route} should render successfully`);
			const body = await response.text();
			if (PUBLIC_TITLES.has(route)) {
				assert.equal(body.match(/<title>(.*?)<\/title>/)?.[1], PUBLIC_TITLES.get(route), `${route} title`);
				assert.ok(body.includes('<meta name="robots" content="index, follow"'), `${route} is indexable`);
				assert.ok(!body.includes('property="og:image"'), "No placeholder social image");
				const canonical = body.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
				if (canonical) canonicals.push(canonical);
			}
			if (PRIVATE_ROUTES.includes(route)) {
				assert.ok(body.includes('<meta name="robots" content="noindex, nofollow"'), `${route} prevents indexing`);
				assert.ok(!body.includes('rel="canonical"'), `${route} has no public canonical URL`);
			}
			if (route === "/") {
				assert.ok(body.includes('href="/brand/favicon.svg"'), "Existing favicon remains configured");
				const json = body.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
				assert.ok(json, "Homepage has JSON-LD");
				const business = JSON.parse(json);
				assert.equal(business["@type"], "Bakery");
				assert.equal(business.name, "Little Town Bakes");
				assert.equal(business.url, canonicals[0], "Business URL agrees with the homepage canonical");
				assert.deepEqual(business.address, {
					"@type": "PostalAddress", addressLocality: "Oakley", addressRegion: "CA", addressCountry: "US",
				});
				for (const field of ["telephone", "email", "sameAs", "streetAddress", "order", "customer", "trackingToken"]) {
					assert.ok(!json.includes(field), `JSON-LD omits ${field}`);
				}
			}
			if (route === "/robots.txt") {
				assert.ok(body.includes("Allow: /"));
				for (const path of ["/admin/", "/checkout", "/orders/", "/api/", "/auth/"]) {
					assert.ok(body.includes(`Disallow: ${path}`), `robots excludes ${path}`);
				}
				if (canonicals.length) {
					assert.ok(body.includes(`Sitemap: ${new URL("/sitemap.xml", canonicals[0]).href}`));
				} else {
					assert.ok(!body.includes("Sitemap:"), "No invented sitemap origin");
				}
			}
			if (route === "/sitemap.xml") {
				const urls = [...body.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
				assert.ok(canonicals.length === 0 || canonicals.length === PUBLIC_TITLES.size);
				assert.deepEqual(urls, canonicals, "Sitemap includes exactly the public canonical URLs");
			}
		}

		console.log(`${route} ${response.status}`);
	}
} catch (error) {
	if (serverOutput.trim()) {
		console.error("Next server output:\n" + serverOutput.trim());
	}
	throw error;
} finally {
	await stopProcess(child);
}
