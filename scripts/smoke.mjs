import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";

const HOST = "127.0.0.1";
const START_TIMEOUT_MS = 30_000;
const REQUEST_TIMEOUT_MS = 5_000;
const ROUTES = ["/", "/checkout", "/admin/login", "/api/health"];

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
