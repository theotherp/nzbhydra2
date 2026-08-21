import {z} from "zod";

import {ApiTransport, type UploadProgress} from "../transport";

const LIST_PATH = "internalapi/backup/list";
const CREATE_PATH = "internalapi/backup/backuponly";
const CREATE_DOWNLOAD_PATH = "internalapi/backup/backup";
const DOWNLOAD_PATH = "internalapi/backup/download";
const RESTORE_PATH = "internalapi/backup/restore";
const UPLOAD_PATH = "internalapi/backup/restorefile";

/**
 * `BackupWeb.restoreFromUpload` binds the uploaded part with
 * `@RequestParam("file")`, so the multipart field name is a server contract
 * (legacy's `Upload.upload({file: file})` wrapper happened to send the same
 * name, but it is the controller that fixes it).
 */
export const BACKUP_UPLOAD_FIELD_NAME = "file";

/**
 * `BackupEntry` (`shared/mapping/.../BackupEntry.java`): a file name and the
 * file's creation `Instant`. Both fields are optional in the generated schema,
 * so the two values the page renders are validated here; `creationDate` is
 * accepted as a string or a number because a Jackson `Instant` is serialized
 * as either an ISO timestamp or an epoch value depending on the mapper's date
 * configuration, and `C-DATE-TIME` reads both.
 */
const backupEntrySchema = z.looseObject({
    creationDate: z.union([z.string(), z.number()]).nullish(),
    filename: z.string().nullish(),
});

const backupListSchema = z.array(backupEntrySchema);

/** `GenericResponse`: a refusal can arrive inside an HTTP 200 body. */
const genericResponseSchema = z.looseObject({
    message: z.string().nullish(),
    successful: z.boolean().nullish(),
});

export type BackupEntry = {
    creationDate: string | number | null;
    filename: string;
};

export type BackupActionResult =
    | {kind: "failed"; message: string | null}
    | {kind: "successful"};

export class MalformedBackupResponseError extends Error {
    constructor() {
        super("The backup response has an invalid format");
    }
}

/**
 * `API-SYSTEM-BACKUP-LIST`: the existing backup files.
 * `BackupAndRestore.getExistingBackups` already sorts them newest first and
 * that order is kept as the display order, the way legacy rendered the list
 * verbatim. An entry without a file name cannot be downloaded or restored, so
 * it is dropped rather than rendered as an unusable row.
 */
export async function getBackups(
    transport: ApiTransport,
): Promise<BackupEntry[]> {
    const parsed = backupListSchema.safeParse(
        await transport.request<unknown>(LIST_PATH),
    );
    if (!parsed.success) {
        throw new MalformedBackupResponseError();
    }
    return parsed.data
        .filter((entry) => typeof entry.filename === "string")
        .map((entry) => ({
            creationDate: entry.creationDate ?? null,
            filename: entry.filename as string,
        }));
}

/**
 * `API-SYSTEM-BACKUP-CREATE`: creates a backup file without sending it back.
 * Legacy passes `dontdownload=true` (`backup.js:24`); the endpoint ignores the
 * parameter, but it is what the recorded API contract carries and it is the
 * only thing distinguishing this call from the downloading one.
 */
export async function createBackup(
    transport: ApiTransport,
): Promise<BackupActionResult> {
    return genericResult(() =>
        transport.request<unknown>(`${CREATE_PATH}?dontdownload=true`),
    );
}

/**
 * `API-SYSTEM-BACKUP-CREATE-DOWNLOAD`: creates a backup and streams it back as
 * `application/octet-stream`, so it goes through the transport's binary path
 * rather than `request` (which would ask for JSON).
 */
export async function createAndDownloadBackup(
    transport: ApiTransport,
): Promise<Blob> {
    return transport.requestBlob(CREATE_DOWNLOAD_PATH);
}

/** Legacy's download name (`backup.js:29`), in the browser's own zone. */
export function createdBackupFileName(now: Date): string {
    const part = (value: number) => String(value).padStart(2, "0");
    return `nzbhydra-backup-${now.getFullYear()}-${part(
        now.getMonth() + 1,
    )}-${part(now.getDate())}-${part(now.getHours())}-${part(
        now.getMinutes(),
    )}.zip`;
}

/**
 * `API-SYSTEM-BACKUP-DOWNLOAD`: the browser fetches the file itself from this
 * base-URL-aware address (legacy `backup.html:36-38`), so a backup archive
 * never passes through the application as a blob and keeps its own name.
 */
export function backupDownloadUrl(
    transport: ApiTransport,
    filename: string,
): string {
    const query = new URLSearchParams({filename});
    return transport.browserTransferUrl(`${DOWNLOAD_PATH}?${query}`);
}

/**
 * `API-SYSTEM-BACKUP-RESTORE`: extracts an existing backup for the wrapper to
 * restore on the next start. The instance restarts itself afterwards, which is
 * why the caller confirms first and hands off to the restart countdown.
 */
export async function restoreBackup(
    transport: ApiTransport,
    filename: string,
): Promise<BackupActionResult> {
    const query = new URLSearchParams({filename});
    return genericResult(() =>
        transport.request<unknown>(`${RESTORE_PATH}?${query}`),
    );
}

/**
 * `API-SYSTEM-BACKUP-UPLOAD`: posts a backup archive for immediate restore.
 * A rejected file (not a zip, unreadable, wrong contents) is answered with
 * `GenericResponse.notOk` inside an HTTP 200, so a refusal arrives here as a
 * `failed` result rather than as a thrown transport error.
 */
export async function uploadBackup(
    transport: ApiTransport,
    file: File,
    onProgress?: (progress: UploadProgress) => void,
): Promise<BackupActionResult> {
    const body = new FormData();
    body.append(BACKUP_UPLOAD_FIELD_NAME, file, file.name);
    return genericResult(() =>
        transport.upload<unknown>(UPLOAD_PATH, body, {onProgress}),
    );
}

async function genericResult(
    call: () => Promise<unknown>,
): Promise<BackupActionResult> {
    let body: unknown;
    try {
        body = await call();
    } catch {
        // A transport failure or a non-2xx status: nothing was confirmed, and
        // there is no server-provided reason to show.
        return {kind: "failed", message: null};
    }
    // An endpoint that answers 200 with no body at all has still run.
    if (body === undefined || body === null) {
        return {kind: "successful"};
    }
    const parsed = genericResponseSchema.safeParse(body);
    if (!parsed.success) {
        return {kind: "failed", message: null};
    }
    // Only an explicit `successful: false` is a refusal.
    if (parsed.data.successful === false) {
        return {kind: "failed", message: parsed.data.message ?? null};
    }
    return {kind: "successful"};
}
