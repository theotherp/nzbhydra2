import type {paths} from "./generated/openapi";
import {ApiTransport} from "./transport";

const WELCOME_PATH = "internalapi/welcomeshown";

export type WelcomeShown =
    paths["/internalapi/welcomeshown"]["get"]["responses"][200]["content"]["*/*"];

export function getWelcomeShown(
    transport: ApiTransport,
): Promise<WelcomeShown> {
    return transport.request<WelcomeShown>(WELCOME_PATH);
}

/**
 * `API-WELCOME-PUT`: records that the first-start welcome has been shown.
 * Legacy sent it as soon as it decided to open the dialog; the React sequence
 * sends it the same way, before the dialog is rendered, so a session that
 * closes the browser mid-dialog is not greeted again.
 */
export async function setWelcomeShown(transport: ApiTransport): Promise<void> {
    await transport.request<unknown>(WELCOME_PATH, {method: "PUT"});
}
