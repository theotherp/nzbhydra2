import {z} from "zod";

import {ApiTransport} from "../transport";

const CHECK_CONNECTION_PATH = "internalapi/downloader/checkConnection";

/**
 * `GenericResponse` (`shared/mapping/.../GenericResponse.java`). A failed check
 * is still an HTTP 200 carrying `successful: false` and a message; only a
 * transport-level failure (or a request the backend refuses to deserialize) is
 * a non-2xx response.
 */
const genericResponseSchema = z.looseObject({
    message: z.string().nullish(),
    successful: z.boolean().nullish(),
});

/**
 * The three outcomes legacy distinguishes (`formly-downloaders.js`
 * `DownloaderConfigBoxService.checkConnection`, whose rejection carries a
 * `checked` flag that `handleConnectionCheckFail` branches on):
 *
 * - `successful` — the downloader answered;
 * - `failed` — the *server* ran the check and reports why it failed
 *   (legacy's `checked: true`);
 * - `unchecked` — the check itself could not be run (legacy's `checked:
 *   false`), which is a different message and a different confirm label.
 */
export type DownloaderConnectionResult =
    | {kind: "failed"; message: string}
    | {kind: "successful"}
    | {kind: "unchecked"};

/**
 * `API-DOWNLOAD-CHECK-CONNECTION`: asks the backend to connect to the
 * downloader described by `downloader` — an unsaved, in-progress
 * `DownloaderConfig` — so an entry can be verified before it is accepted into
 * the configuration. Nothing is persisted by it: `DownloaderProvider`
 * instantiates a throwaway downloader from the posted config.
 *
 * The posted object must carry `enabled` and `addPaused` as real booleans.
 * `DownloaderConfig` is a Lombok `@AllArgsConstructor` record, so Jackson
 * treats every field as a creator parameter and answers HTTP 400
 * ("Cannot map `null` into type `boolean`") when either primitive is absent —
 * verified against the running backend. `downloaderEntry` in
 * `features/config/downloading/downloadingSettings.ts` is what guarantees it.
 * Keys the backend does not model (legacy's presets seed a `nzbAccessType`
 * that `DownloaderConfig` has no field for) are ignored rather than rejected.
 */
export async function checkDownloaderConnection(
    transport: ApiTransport,
    downloader: unknown,
): Promise<DownloaderConnectionResult> {
    let response: unknown;
    try {
        response = await transport.request<unknown>(CHECK_CONNECTION_PATH, {
            json: downloader,
            method: "POST",
        });
    } catch {
        return {kind: "unchecked"};
    }
    const parsed = genericResponseSchema.safeParse(response);
    if (!parsed.success) {
        // A body this build cannot read is not evidence that the downloader
        // works, and legacy's "checked" branch would have nothing to show.
        return {kind: "unchecked"};
    }
    if (parsed.data.successful === true) {
        return {kind: "successful"};
    }
    return {kind: "failed", message: parsed.data.message ?? ""};
}
