import {describe, expect, it, vi} from "vitest";
import {
    addFilesRequest,
    categories,
    configuredDefaultCategory,
    downloadId,
    historyDownloadResult,
    isCompatibleWithDownloader,
    MalformedDownloadResponseError,
    prepareZip,
    requiresDuplicateReason,
    saveNzbs,
    saveOrSendTorrents,
    sendToDownloader,
} from "./actions";
import {ApiTransport} from "../../api/transport";

const result = {
    searchResultId: "1.2",
    downloadId: "3.4",
    title: "Result",
    indexer: "Mock",
    category: "Movies",
    originalCategory: "2000",
};
describe("download actions", () => {
    it("should prefer download IDs and preserve source and mapped categories", () =>
        expect(addFilesRequest({name: "SAB"}, [result], null, null)).toEqual({
            downloaderName: "SAB",
            category: null,
            reason: null,
            searchResults: [
                {
                    searchResultId: "3.4",
                    originalCategory: "2000",
                    mappedCategory: "Movies",
                },
            ],
        }));
    // FM-186 moved both helpers here from `DownloadActions.tsx`, where the
    // bulk bar was their only caller; the per-row send buttons are the second.
    // The semantics are unchanged, and these are the rules that decide them.
    it("should treat only a non-empty configured default category as a default", () => {
        expect(configuredDefaultCategory({name: "SAB"})).toBeNull();
        expect(
            configuredDefaultCategory({name: "SAB", defaultCategory: ""}),
        ).toBeNull();
        expect(
            configuredDefaultCategory({name: "SAB", defaultCategory: "Movies"}),
        ).toBe("Movies");
    });

    it("should send a TORBOX result only to a TORBOX downloader, and no torrent to any", () => {
        const sab = {name: "SAB", downloaderType: "SABNZBD"};
        const torbox = {name: "Torbox", downloaderType: "TORBOX"};
        const of = (downloadType?: string) => ({...result, downloadType});
        expect(isCompatibleWithDownloader(of("TORBOX"), torbox)).toBe(true);
        expect(isCompatibleWithDownloader(of("TORBOX"), sab)).toBe(false);
        expect(isCompatibleWithDownloader(of("TORRENT"), sab)).toBe(false);
        expect(isCompatibleWithDownloader(of("TORRENT"), torbox)).toBe(false);
        expect(isCompatibleWithDownloader(of("NZB"), sab)).toBe(true);
        expect(isCompatibleWithDownloader(of("NZB"), torbox)).toBe(true);
        // A result with no download type at all is not a torrent, so it stays
        // sendable -- the rule is written as "not TORRENT", not "is NZB".
        expect(isCompatibleWithDownloader(of(undefined), sab)).toBe(true);
    });

    it("should map a download-history search result to a direct-action-ready result using its own identifier", () => {
        const mapped = historyDownloadResult({
            id: "42",
            title: "History title",
            downloadType: "TORRENT",
        });
        expect(mapped.title).toBe("History title");
        expect(mapped.downloadType).toBe("TORRENT");
        expect(downloadId(mapped)).toBe("42");
    });
    it("should construct duplicate and send requests through transport", async () => {
        const fetchImplementation = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({reasonRequired: false}), {
                headers: {"Content-Type": "application/json"},
            }),
        );
        const transport = new ApiTransport("/", fetchImplementation);
        const request = addFilesRequest({name: "SAB"}, [result], null, null);
        await expect(requiresDuplicateReason(transport, request)).resolves.toBe(
            false,
        );
        fetchImplementation.mockResolvedValueOnce(
            new Response(JSON.stringify({successful: true}), {
                headers: {"Content-Type": "application/json"},
            }),
        );
        await sendToDownloader(transport, request);
        expect(fetchImplementation).toHaveBeenLastCalledWith(
            expect.stringMatching(/addNzbs$/),
            expect.objectContaining({
                method: "PUT",
                body: JSON.stringify(request),
            }),
        );
        expect(downloadId({...result, downloadId: undefined})).toBe("1.2");
    });

    it("should reject malformed categories, duplicate checks, actions, and ZIP responses", async () => {
        const fetchImplementation = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(JSON.stringify(["movies", 3]), {
                    headers: {"Content-Type": "application/json"},
                }),
            )
            .mockResolvedValueOnce(
                new Response(JSON.stringify({reasonRequired: "yes"}), {
                    headers: {"Content-Type": "application/json"},
                }),
            )
            .mockResolvedValueOnce(
                new Response(
                    JSON.stringify({
                        successful: true,
                        addedIds: ["1"],
                    }),
                    {headers: {"Content-Type": "application/json"}},
                ),
            )
            .mockResolvedValueOnce(
                new Response(
                    JSON.stringify({
                        successful: true,
                    }),
                    {headers: {"Content-Type": "application/json"}},
                ),
            );
        const transport = new ApiTransport("/", fetchImplementation);
        const request = addFilesRequest({name: "SAB"}, [result], null, null);
        await expect(
            categories(transport, {name: "SAB"}),
        ).rejects.toBeInstanceOf(MalformedDownloadResponseError);
        await expect(
            requiresDuplicateReason(transport, request),
        ).rejects.toBeInstanceOf(MalformedDownloadResponseError);
        await expect(saveNzbs(transport, [result])).rejects.toBeInstanceOf(
            MalformedDownloadResponseError,
        );
        await expect(prepareZip(transport, [result])).rejects.toBeInstanceOf(
            MalformedDownloadResponseError,
        );
    });

    it("should validate torrent action responses", async () => {
        const transport = new ApiTransport(
            "/",
            vi.fn().mockResolvedValue(
                new Response(
                    JSON.stringify({
                        successful: false,
                        message: "Unavailable",
                        addedIds: [],
                        missedIds: [],
                        invalidIds: [],
                    }),
                    {headers: {"Content-Type": "application/json"}},
                ),
            ),
        );
        await expect(
            saveOrSendTorrents(transport, [result]),
        ).resolves.toMatchObject({successful: false});
    });

    // FM-128: the ids in `addedIds`/`missedIds` are the backend's 64-bit
    // `Long` search-result hashes, well outside JavaScript's safe-integer
    // range. `-4934754469460477069` is one the live system test's own indexer
    // produces. Every action below shares `actionResponseSchema`, so a
    // safe-range bound on it failed all four on success at once -- each needs
    // its own proof, not just the one the search results' chip depends on.
    describe("64-bit result ids", () => {
        // Deliberately kept as wire text and parsed by `Response.json()`
        // rather than written as numeric literals: a literal would be rounded
        // by the TypeScript source itself (and `no-loss-of-precision` rightly
        // refuses one), which would hide the very step under test. `Number()`
        // here rounds exactly as `JSON.parse` does below -- the same symmetry
        // `SearchResults.tsx:942` relies on to match an id back to its row.
        const liveIdText = "-4934754469460477069";
        const missedIdText = "8654321098765432101";
        const liveId = Number(liveIdText);
        const missedId = Number(missedIdText);

        function transportReturning(body: string): ApiTransport {
            return new ApiTransport(
                "/",
                vi.fn().mockResolvedValue(
                    new Response(body, {
                        headers: {"Content-Type": "application/json"},
                    }),
                ),
            );
        }

        const addedBody = `{"successful":true,"addedIds":[${liveIdText}],"missedIds":[],"invalidIds":[]}`;

        it("should accept a 64-bit added ID when sending to the downloader", async () => {
            const transport = transportReturning(addedBody);
            const request = addFilesRequest(
                {name: "SAB"},
                [result],
                null,
                null,
            );
            await expect(
                sendToDownloader(transport, request),
            ).resolves.toMatchObject({successful: true, addedIds: [liveId]});
        });

        it("should accept a 64-bit added ID when saving NZBs to the black hole", async () => {
            const transport = transportReturning(addedBody);
            await expect(saveNzbs(transport, [result])).resolves.toMatchObject({
                successful: true,
                addedIds: [liveId],
            });
        });

        it("should accept a 64-bit added ID when saving or sending torrents", async () => {
            const transport = transportReturning(addedBody);
            await expect(
                saveOrSendTorrents(transport, [result]),
            ).resolves.toMatchObject({successful: true, addedIds: [liveId]});
        });

        it("should accept a 64-bit added ID when preparing a ZIP", async () => {
            const transport = transportReturning(
                `{"successful":true,"zipFilepath":"/tmp/results.zip","addedIds":[${liveIdText}],"missedIds":[],"invalidIds":[]}`,
            );
            await expect(
                prepareZip(transport, [result]),
            ).resolves.toMatchObject({
                successful: true,
                zipFilepath: "/tmp/results.zip",
            });
        });

        // `missedIds` carries the same server-side `Collection<Long>`, so
        // relaxing only `addedIds` would still fail a partially successful
        // send -- the case a user is most likely to hit.
        it("should accept a 64-bit missed ID alongside an added one", async () => {
            const transport = transportReturning(
                `{"successful":true,"addedIds":[${liveIdText}],"missedIds":[${missedIdText}],"invalidIds":[]}`,
            );
            const request = addFilesRequest(
                {name: "SAB"},
                [result],
                null,
                null,
            );
            await expect(
                sendToDownloader(transport, request),
            ).resolves.toMatchObject({missedIds: [missedId]});
        });

        // The bound was dropped for range only. Integrality is still the
        // contract: a fractional id means the response is not what this
        // client models, and must still be refused rather than waved through.
        it("should still reject a non-integer result ID", async () => {
            const transport = transportReturning(
                '{"successful":true,"addedIds":[1.5],"missedIds":[],"invalidIds":[]}',
            );
            const request = addFilesRequest(
                {name: "SAB"},
                [result],
                null,
                null,
            );
            await expect(
                sendToDownloader(transport, request),
            ).rejects.toBeInstanceOf(MalformedDownloadResponseError);
        });
    });
});
