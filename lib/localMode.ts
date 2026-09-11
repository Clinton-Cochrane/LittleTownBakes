import { NextResponse } from "next/server";

export const LOCAL_ADMIN_EMAIL = "root@local.test";
export const LOCAL_ADMIN_PASSWORD = "toor";
export const LOCAL_ADMIN_COOKIE = "little-town-bakes-local-admin";
export const LOCAL_ADMIN_COOKIE_VALUE = "authenticated";

type LocalModeEnvironment = {
	NODE_ENV?: string;
	LOCAL_DATA_SOURCE?: string;
};

/** Local mode is explicit and is structurally unavailable in production. */
export function isLocalMode(environment: LocalModeEnvironment = process.env): boolean {
	return environment.NODE_ENV !== "production" && environment.LOCAL_DATA_SOURCE === "json";
}

export function localMutationUnavailable() {
	return NextResponse.json(
		{
			code: "LOCAL_READ_ONLY",
			error: "This admin action is unavailable in local mode. Reset local data with npm run local:reset.",
		},
		{ status: 409 },
	);
}
