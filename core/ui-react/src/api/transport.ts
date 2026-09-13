const CSRF_COOKIE_NAME = "HYDRA-XSRF-TOKEN";
const CSRF_HEADER_NAME = "X-XSRF-TOKEN";

type HttpMethod = "DELETE" | "GET" | "PATCH" | "POST" | "PUT";

export type TransportRequest = Omit<
    RequestInit,
    "body" | "headers" | "method"
> & {
    body?: BodyInit | null;
    form?: URLSearchParams;
    headers?: HeadersInit;
    json?: unknown;
    method?: HttpMethod;
};

/** How much of an upload's body has reached the server so far. */
export type UploadProgress = {
    loaded: number;
    /** `null` while the browser cannot compute the request's length. */
    total: number | null;
};

export type UploadOptions = {
    method?: HttpMethod;
    onProgress?: (progress: UploadProgress) => void;
    /** Test seam; the browser's own `XMLHttpRequest` by default. */
    xhrImplementation?: () => XMLHttpRequest;
};

export class ApiError extends Error {
    constructor(
        message: string,
        readonly status: number,
        readonly data: unknown,
    ) {
        super(message);
    }
}

export class UnauthorizedError extends ApiError {}

export class ForbiddenError extends ApiError {}

export class ApiTransport {
    private readonly base: URL;

    constructor(
        baseUrl: string,
        private readonly fetchImplementation: typeof fetch = window.fetch.bind(
            window,
        ),
    ) {
        this.base = new URL(baseUrl, window.location.origin);
        if (this.base.origin !== window.location.origin) {
            throw new Error("API transport base URL must be same-origin");
        }
        this.base.pathname = this.base.pathname.endsWith("/")
            ? this.base.pathname
            : `${this.base.pathname}/`;
    }

    async request<T>(path: string, options: TransportRequest = {}): Promise<T> {
        const {
            body: configuredBody,
            form,
            headers: configuredHeaders,
            json,
            method = "GET",
            ...init
        } = options;
        const headers = new Headers(configuredHeaders);
        headers.set("Accept", "application/json");
        const body = requestBody(configuredBody, form, json, headers);
        const csrfToken = unsafeMethod(method)
            ? cookieValue(CSRF_COOKIE_NAME)
            : undefined;
        if (csrfToken !== undefined) {
            headers.set(CSRF_HEADER_NAME, csrfToken);
        }

        const response = await this.fetchImplementation(this.url(path), {
            ...init,
            body,
            credentials: "same-origin",
            headers,
            method,
        });
        const data = await responseData(response);
        if (!response.ok) {
            throw responseError(response.status, data);
        }
        return data as T;
    }

    async requestBlob(
        path: string,
        options: TransportRequest = {},
    ): Promise<Blob> {
        const {
            body: configuredBody,
            form,
            headers: configuredHeaders,
            json,
            method = "GET",
            ...init
        } = options;
        const headers = new Headers(configuredHeaders);
        const body = requestBody(configuredBody, form, json, headers);
        const csrfToken = unsafeMethod(method)
            ? cookieValue(CSRF_COOKIE_NAME)
            : undefined;
        if (csrfToken !== undefined) {
            headers.set(CSRF_HEADER_NAME, csrfToken);
        }
        const response = await this.fetchImplementation(this.url(path), {
            ...init,
            body,
            credentials: "same-origin",
            headers,
            method,
        });
        if (!response.ok) {
            throw responseError(response.status, await responseData(response));
        }
        return response.blob();
    }

    /**
     * ADR-0003's explicitly reserved upload path: `fetch` cannot observe the
     * *request* body's progress, so a file upload that has to show how far it
     * has come is sent through `XMLHttpRequest` instead. Everything else about
     * the contract is the same as `request`: the application-base-relative
     * URL, `credentials: "same-origin"` (`withCredentials` is the XHR spelling
     * for a same-origin request that carries the session cookie), and the CSRF
     * header for the unsafe method.
     *
     * The response is parsed like any other, so an endpoint that reports a
     * refusal inside an HTTP 200 body reaches the caller as a resolved value —
     * only a transport failure or a non-2xx status rejects.
     */
    async upload<T>(
        path: string,
        body: FormData,
        options: UploadOptions = {},
    ): Promise<T> {
        const {
            method = "POST",
            onProgress,
            xhrImplementation = () => new XMLHttpRequest(),
        } = options;
        const url = this.url(path);
        const csrfToken = unsafeMethod(method)
            ? cookieValue(CSRF_COOKIE_NAME)
            : undefined;
        return new Promise<T>((resolve, reject) => {
            const xhr = xhrImplementation();
            xhr.open(method, url);
            xhr.withCredentials = true;
            xhr.setRequestHeader("Accept", "application/json");
            if (csrfToken !== undefined) {
                xhr.setRequestHeader(CSRF_HEADER_NAME, csrfToken);
            }
            // The browser sets `Content-Type` (including the multipart
            // boundary) from the `FormData` body; setting it here would break
            // the boundary the server parses the parts with.
            if (onProgress) {
                xhr.upload.addEventListener("progress", (event) => {
                    onProgress({
                        loaded: event.loaded,
                        // `lengthComputable` is false while the total is
                        // unknown; a caller then has a loaded count and no
                        // total, which is exactly what it should render.
                        total: event.lengthComputable ? event.total : null,
                    });
                });
            }
            xhr.addEventListener("error", () =>
                reject(new Error(`Upload to ${path} failed`)),
            );
            xhr.addEventListener("abort", () =>
                reject(new Error(`Upload to ${path} was aborted`)),
            );
            xhr.addEventListener("load", () => {
                const data = xhrResponseData(xhr);
                if (xhr.status < 200 || xhr.status >= 300) {
                    reject(responseError(xhr.status, data));
                    return;
                }
                resolve(data as T);
            });
            xhr.send(body);
        });
    }

    browserTransferUrl(path: string): string {
        return this.url(path);
    }

    private url(path: string): string {
        if (!path || path.startsWith("/")) {
            throw new Error("API paths must be application-base-relative");
        }
        const url = new URL(path, this.base);
        if (
            url.origin !== this.base.origin ||
            !url.pathname.startsWith(this.base.pathname)
        ) {
            throw new Error("API path escapes the application base URL");
        }
        return url.toString();
    }
}

function requestBody(
    body: BodyInit | null | undefined,
    form: URLSearchParams | undefined,
    json: unknown,
    headers: Headers,
): BodyInit | null | undefined {
    if ([body, form, json].filter((value) => value !== undefined).length > 1) {
        throw new Error("A transport request may specify only one body type");
    }
    if (json !== undefined) {
        headers.set("Content-Type", "application/json");
        return JSON.stringify(json);
    }
    if (form !== undefined) {
        headers.set(
            "Content-Type",
            "application/x-www-form-urlencoded;charset=UTF-8",
        );
        return form;
    }
    return body;
}

async function responseData(response: Response): Promise<unknown> {
    if (
        response.status === 204 ||
        response.headers.get("Content-Length") === "0"
    ) {
        return undefined;
    }
    const text = await response.text();
    if (!text) {
        return undefined;
    }
    return response.headers.get("Content-Type")?.includes("json")
        ? JSON.parse(text)
        : text;
}

/** `responseData`'s rule (JSON by content type, otherwise text) for an XHR. */
function xhrResponseData(xhr: XMLHttpRequest): unknown {
    const text = xhr.responseText;
    if (!text) {
        return undefined;
    }
    if (!xhr.getResponseHeader("Content-Type")?.includes("json")) {
        return text;
    }
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

function responseError(status: number, data: unknown): ApiError {
    const message = `Request failed with status ${status}`;
    if (status === 401) {
        return new UnauthorizedError(message, status, data);
    }
    if (status === 403) {
        return new ForbiddenError(message, status, data);
    }
    return new ApiError(message, status, data);
}

function unsafeMethod(method: HttpMethod): boolean {
    return method !== "GET";
}

function cookieValue(name: string): string | undefined {
    const prefix = `${name}=`;
    const value = document.cookie
        .split(";")
        .map((cookie) => cookie.trim())
        .find((cookie) => cookie.startsWith(prefix));
    return value === undefined
        ? undefined
        : decodeURIComponent(value.slice(prefix.length));
}
