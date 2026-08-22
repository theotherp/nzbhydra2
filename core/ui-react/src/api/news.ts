import type {paths} from "./generated/openapi";
import {ApiTransport} from "./transport";

export type NewsListResponse =
    paths["/internalapi/news"]["get"]["responses"][200]["content"]["*/*"];

const CURRENT_VERSION_NEWS_PATH = "internalapi/news/forcurrentversion";
const SAVE_SHOWN_PATH = "internalapi/news/saveshown";
const USER_NEWS_PATH = "internalapi/usernews";

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

/**
 * `API-NEWS-CURRENT-VERSION`: the news entries for the running version and
 * newer ones — the ones the startup announcement dialog shows once.
 */
export async function getNewsForCurrentVersion(
    transport: ApiTransport,
): Promise<NewsEntry[]> {
    return parseNewsEntries(
        await transport.request<unknown>(CURRENT_VERSION_NEWS_PATH),
    );
}

/** `API-NEWS-SAVE-SHOWN`: acknowledges the news the dialog just displayed. */
export async function saveNewsShown(transport: ApiTransport): Promise<void> {
    await transport.request<unknown>(SAVE_SHOWN_PATH, {method: "PUT"});
}

/** `UserNewsEntryForWeb`: one personally addressed, server-authored notice. */
export type UserNewsEntry = {
    id: string;
    newsAsHtml: string;
    title: string;
};

/**
 * `API-USER-NEWS-LIST`: the notices this session has not dismissed yet, in the
 * order the backend returns them — which is the order they are shown in.
 */
export async function getUserNews(
    transport: ApiTransport,
): Promise<UserNewsEntry[]> {
    return parseUserNewsEntries(
        await transport.request<unknown>(USER_NEWS_PATH),
    );
}

/** `API-USER-NEWS-DISMISS`: marks one notice read so it is not shown again. */
export async function dismissUserNews(
    transport: ApiTransport,
    id: string,
): Promise<void> {
    await transport.request<unknown>(
        `${USER_NEWS_PATH}/${encodeURIComponent(id)}/dismiss`,
        {method: "PUT"},
    );
}

/**
 * A notice without an ID could never be dismissed and would be shown on every
 * load, and one without body text has nothing to show, so both are dropped
 * rather than failing the whole list — legacy rendered them as empty dialogs.
 */
export function parseUserNewsEntries(response: unknown): UserNewsEntry[] {
    if (!Array.isArray(response)) {
        throw new MalformedNewsResponseError();
    }

    return response.flatMap((entry) => {
        if (
            !isRecord(entry) ||
            typeof entry.id !== "string" ||
            entry.id === "" ||
            typeof entry.newsAsHtml !== "string"
        ) {
            return [];
        }
        return [
            {
                id: entry.id,
                newsAsHtml: entry.newsAsHtml,
                title: typeof entry.title === "string" ? entry.title : "",
            },
        ];
    });
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
