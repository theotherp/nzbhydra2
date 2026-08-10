import type {paths} from "./generated/openapi";
import {ApiTransport} from "./transport";

export type NewsListResponse =
    paths["/internalapi/news"]["get"]["responses"][200]["content"]["*/*"];

export type NewsEntry = {
    version: string;
    news: string;
    forCurrentVersion: boolean;
    forNewerVersion: boolean;
};

export class MalformedNewsResponseError extends Error {
    constructor() {
        super("The news response has an invalid format");
    }
}

export async function getNews(transport: ApiTransport): Promise<NewsEntry[]> {
    const response =
        await transport.request<NewsListResponse>("internalapi/news");
    return parseNewsEntries(response);
}

export function parseNewsEntries(response: unknown): NewsEntry[] {
    if (!Array.isArray(response)) {
        throw new MalformedNewsResponseError();
    }

    return response.map((entry) => {
        if (
            !isRecord(entry) ||
            typeof entry.version !== "string" ||
            typeof entry.news !== "string" ||
            typeof entry.forCurrentVersion !== "boolean" ||
            typeof entry.forNewerVersion !== "boolean"
        ) {
            throw new MalformedNewsResponseError();
        }

        return {
            version: entry.version,
            news: entry.news,
            forCurrentVersion: entry.forCurrentVersion,
            forNewerVersion: entry.forNewerVersion,
        };
    });
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}
