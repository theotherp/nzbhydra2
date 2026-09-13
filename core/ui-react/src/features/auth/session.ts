import {ApiTransport} from "../../api/transport";
import {type BootstrapData, getBootstrapData} from "../../bootstrap";

export type FormCredentials = {
    password: string;
    username: string;
};

export async function loginWithForm(
    transport: ApiTransport,
    credentials: FormCredentials,
): Promise<BootstrapData> {
    await transport.request<void>("login", {
        form: new URLSearchParams(credentials),
        method: "POST",
    });
    return currentSession(transport);
}

export async function logout(transport: ApiTransport): Promise<BootstrapData> {
    await transport.request<void>("logout", {method: "POST"});
    return currentSession(transport);
}

/**
 * Legacy's `askForPassword` (`hydra-auth-service.js`): under BASIC
 * authentication there is no login form — the browser owns the credential
 * prompt. This request is what provokes it, and `old_username` tells the
 * backend which cached credential to refuse so the browser asks again instead
 * of silently replaying the previous user's header.
 *
 * Only the outcome matters, not the body: `AuthWeb.askForPassword` answers 401
 * with a `WWW-Authenticate` challenge while the session is still anonymous, and
 * 200 once the browser has supplied credentials the server accepts. Its 200
 * body is `UserInfosProvider.getUserInfos`, which — unlike
 * `API-AUTH-USER-INFOS` — never sets `baseUrl` or `safeConfig`, so it is not
 * `BootstrapData` and must not be run through the bootstrap validator. The
 * caller's full document navigation fetches the real bootstrap anyway.
 */
export async function askForPassword(
    transport: ApiTransport,
    oldUsername: string | null = null,
): Promise<void> {
    const query =
        oldUsername === null
            ? ""
            : `?${new URLSearchParams({old_username: oldUsername})}`;
    await transport.request<unknown>(`internalapi/askpassword${query}`);
}

const PREVIOUS_USERNAME_KEY = "nzbhydra.previousUsername";

/**
 * The name of the user who was logged in before the last logout. Legacy kept
 * it in the header controller's scope, which survived because logging out
 * never left the page; with FM-078's full-document navigation contract (see
 * `navigation.ts`) the only way to still know it on the next page is to write
 * it down. Session storage, so it dies with the tab, and every access is
 * guarded — a browser may refuse storage entirely, and a missing previous name
 * only costs BASIC users one extra credential prompt.
 */
export function rememberPreviousUsername(username: string | null): void {
    try {
        if (username === null) {
            window.sessionStorage.removeItem(PREVIOUS_USERNAME_KEY);
        } else {
            window.sessionStorage.setItem(PREVIOUS_USERNAME_KEY, username);
        }
    } catch {
        // Storage unavailable; the BASIC challenge simply loses its hint.
    }
}

export function previousUsername(): string | null {
    try {
        return window.sessionStorage.getItem(PREVIOUS_USERNAME_KEY);
    } catch {
        return null;
    }
}

async function currentSession(transport: ApiTransport): Promise<BootstrapData> {
    return getBootstrapData(
        await transport.request<unknown>("internalapi/userinfos"),
    );
}
