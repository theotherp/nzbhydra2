import {describe, expect, it, vi} from "vitest";
import {
    addFilesRequest,
    categories,
    downloadId,
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
});
