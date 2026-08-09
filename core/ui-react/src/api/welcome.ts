import type {paths} from "./generated/openapi";
import {ApiTransport} from "./transport";

export type WelcomeShown =
    paths["/internalapi/welcomeshown"]["get"]["responses"][200]["content"]["*/*"];

export function getWelcomeShown(
    transport: ApiTransport,
): Promise<WelcomeShown> {
    return transport.request<WelcomeShown>("internalapi/welcomeshown");
}
