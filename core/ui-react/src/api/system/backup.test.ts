import {describe, expect, it, vi} from "vitest";

import {ApiTransport} from "../transport";
import {
    BACKUP_UPLOAD_FIELD_NAME,
    backupDownloadUrl,
    createBackup,
    createAndDownloadBackup,
    createdBackupFileName,
    getBackups,
    MalformedBackupResponseError,
    restoreBackup,
    uploadBackup,
} from "./backup";

function jsonTransport(body: unknown, status = 200) {
    const fetchImplementation = vi.fn().mockResolvedValue(
        new Response(JSON.stringify(body), {
            headers: {"Content-Type": "application/json"},
            status,
        }),
    );
    return {
        fetchImplementation,
        transport: new ApiTransport("/hydra/", fetchImplementation),
    };
}

describe("backup API", () => {
    it("should keep the server's newest-first order and drop an entry without a file name", async () => {
        const {transport, fetchImplementation} = jsonTransport([
            {creationDate: "2026-08-20T10:00:00Z", filename: "newer.zip"},
            {creationDate: 1755600000, filename: "older.zip"},
            {creationDate: "2026-08-19T10:00:00Z"},
        ]);

        await expect(getBackups(transport)).resolves.toEqual([
            {creationDate: "2026-08-20T10:00:00Z", filename: "newer.zip"},
            {creationDate: 1755600000, filename: "older.zip"},
        ]);
        expect(fetchImplementation.mock.calls[0][0]).toBe(
            "http://localhost:3000/hydra/internalapi/backup/list",
        );
    });

    it("should reject a backup list that is not a list", async () => {
        const {transport} = jsonTransport({backups: []});

        await expect(getBackups(transport)).rejects.toBeInstanceOf(
            MalformedBackupResponseError,
        );
    });

    it("should create a backup without downloading it", async () => {
        const {transport, fetchImplementation} = jsonTransport({
            successful: true,
        });

        await expect(createBackup(transport)).resolves.toEqual({
            kind: "successful",
        });
        expect(fetchImplementation.mock.calls[0][0]).toBe(
            "http://localhost:3000/hydra/internalapi/backup/backuponly?dontdownload=true",
        );
    });

    it("should report a refusal that arrives inside a 200 response", async () => {
        const {transport} = jsonTransport({
            message: "No backup folder",
            successful: false,
        });

        await expect(createBackup(transport)).resolves.toEqual({
            kind: "failed",
            message: "No backup folder",
        });
    });

    it("should report a failing status as a failure without a server message", async () => {
        const {transport} = jsonTransport({message: "denied"}, 403);

        await expect(createBackup(transport)).resolves.toEqual({
            kind: "failed",
            message: null,
        });
    });

    it("should stream a created backup through the binary path", async () => {
        const fetchImplementation = vi
            .fn()
            .mockResolvedValue(new Response("zip bytes"));
        const transport = new ApiTransport("/hydra/", fetchImplementation);

        await expect(
            createAndDownloadBackup(transport),
        ).resolves.toBeInstanceOf(Blob);
        expect(fetchImplementation.mock.calls[0][0]).toBe(
            "http://localhost:3000/hydra/internalapi/backup/backup",
        );
    });

    it("should name a created backup the way legacy did", () => {
        expect(createdBackupFileName(new Date(2026, 7, 5, 4, 3))).toBe(
            "nzbhydra-backup-2026-08-05-04-03.zip",
        );
    });

    it("should build a base-URL-aware download link for a listed backup", () => {
        const transport = new ApiTransport("/hydra/");

        expect(backupDownloadUrl(transport, "nzbhydra backup.zip")).toBe(
            "http://localhost:3000/hydra/internalapi/backup/download?filename=nzbhydra+backup.zip",
        );
    });

    it("should restore an existing backup by file name", async () => {
        const {transport, fetchImplementation} = jsonTransport({
            successful: true,
        });

        await expect(
            restoreBackup(transport, "nzbhydra backup.zip"),
        ).resolves.toEqual({kind: "successful"});
        expect(fetchImplementation.mock.calls[0][0]).toBe(
            "http://localhost:3000/hydra/internalapi/backup/restore?filename=nzbhydra+backup.zip",
        );
    });

    it("should post an uploaded backup under the controller's multipart field name", async () => {
        const transport = new ApiTransport("/hydra/");
        const upload = vi
            .spyOn(transport, "upload")
            .mockResolvedValue({successful: true});
        const file = new File(["backup"], "backup.zip", {
            type: "application/zip",
        });
        const onProgress = vi.fn();

        await expect(
            uploadBackup(transport, file, onProgress),
        ).resolves.toEqual({kind: "successful"});
        const [path, body, options] = upload.mock.calls[0];
        expect(path).toBe("internalapi/backup/restorefile");
        const part = (body as FormData).get(BACKUP_UPLOAD_FIELD_NAME) as File;
        expect(part.name).toBe(file.name);
        expect(part.size).toBe(file.size);
        expect(part.type).toBe("application/zip");
        expect(BACKUP_UPLOAD_FIELD_NAME).toBe("file");
        expect(options?.onProgress).toBe(onProgress);
    });

    it("should treat an upload the server refuses as a refusal, not an error", async () => {
        const transport = new ApiTransport("/hydra/");
        vi.spyOn(transport, "upload").mockResolvedValue({
            message: "Not a valid backup file",
            successful: false,
        });

        await expect(
            uploadBackup(
                transport,
                new File(["nope"], "notes.txt", {type: "text/plain"}),
            ),
        ).resolves.toEqual({
            kind: "failed",
            message: "Not a valid backup file",
        });
    });

    it("should report an upload whose transport fails as a failure", async () => {
        const transport = new ApiTransport("/hydra/");
        vi.spyOn(transport, "upload").mockRejectedValue(
            new Error("Upload failed"),
        );

        await expect(
            uploadBackup(transport, new File(["backup"], "backup.zip")),
        ).resolves.toEqual({kind: "failed", message: null});
    });
});
