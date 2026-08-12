import {
    cleanup,
    fireEvent,
    render,
    screen,
    within,
} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";

import {DialogProvider} from "../../../components/dialogs/DialogProvider";
import {ToastProvider} from "../../../components/toasts/ToastProvider";
import {SearchResults} from "./SearchResults";

const response = {
    searchResults: [],
    malformedResultCount: 0,
    indexerSearchMetaDatas: [],
    indexerLimitWarnings: [],
    rejectedReasonsMap: {},
    notPickedIndexersWithReason: {},
    numberOfAvailableResults: 0,
    numberOfRejectedResults: 0,
};

function renderResults(ui: React.ReactNode) {
    return render(
        <DialogProvider>
            <ToastProvider>{ui}</ToastProvider>
        </DialogProvider>,
    );
}

describe("SearchResults", () => {
    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
        window.localStorage?.clear();
        delete window.__NZBHYDRA_BOOTSTRAP__;
    });

    it("should render no-picked, all-failed, empty, warning, and rejected states", () => {
        const {rerender} = renderResults(
            <SearchResults
                data={{
                    ...response,
                    notPickedIndexersWithReason: {Mock: "disabled"},
                }}
            />,
        );
        expect(
            screen.getByText("No indexers were picked for this search"),
        ).toBeVisible();
        rerender(
            <SearchResults
                data={{
                    ...response,
                    indexerSearchMetaDatas: [
                        {indexerName: "Mock", wasSuccessful: false},
                    ],
                }}
            />,
        );
        expect(screen.getByText(/Unable to search any indexer/)).toBeVisible();
        rerender(
            <SearchResults
                data={{
                    ...response,
                    indexerSearchMetaDatas: [
                        {indexerName: "Mock", wasSuccessful: true},
                    ],
                    indexerLimitWarnings: ["Near limit"],
                    numberOfRejectedResults: 2,
                }}
            />,
        );
        expect(
            screen.getByText("No results were found for this search"),
        ).toBeVisible();
        expect(screen.getByTestId("indexer-limit-warnings")).toBeVisible();
        expect(screen.getByText("Rejected 2 results.")).toBeVisible();
    });

    it("should preserve result selectors for valid entries", () => {
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 1,
                    searchResults: [
                        {
                            searchResultId: "1",
                            title: "Result",
                            indexer: "Mock",
                            category: "All",
                        },
                    ],
                }}
            />,
        );
        expect(screen.getByTestId("search-results-table")).toBeVisible();
        expect(screen.getByTestId("search-result-row")).toHaveTextContent(
            "Result",
        );
    });

    it("should alert when malformed rows were skipped", () => {
        renderResults(
            <SearchResults data={{...response, malformedResultCount: 1}} />,
        );
        expect(
            screen.getByText("1 malformed result entries were not displayed."),
        ).toBeVisible();
    });

    it("should sort and filter rows with accessible controls", () => {
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 2,
                    searchResults: [
                        {
                            searchResultId: "1",
                            title: "Zulu WEB",
                            indexer: "One",
                            category: "Movies",
                            size: 5 * 1024 * 1024,
                            grabs: 3,
                            epoch: 1_700_000_000,
                            age: "2 days",
                        },
                        {
                            searchResultId: "2",
                            title: "Alpha BluRay",
                            indexer: "Two",
                            category: "TV",
                            size: 2 * 1024 * 1024,
                            seeders: 8,
                            epoch: 1_600_000_000,
                            age: "3 years",
                        },
                    ],
                }}
            />,
        );
        const titleSort = screen.getByTestId("sort-title");
        expect(titleSort).toHaveAttribute("data-sort-direction", "none");
        fireEvent.click(titleSort);
        expect(titleSort).toHaveAttribute("data-sort-direction", "asc");
        expect(titleSort).toHaveTextContent("Title (ascending)");
        expect(
            screen.getAllByTestId("search-result-title")[0],
        ).toHaveTextContent("Alpha BluRay");
        fireEvent.click(titleSort);
        expect(titleSort).toHaveTextContent("Title (descending)");
        fireEvent.click(titleSort);

        fireEvent.change(screen.getByTestId("freetext-filter-title"), {
            target: {value: "!web"},
        });
        expect(screen.getByTestId("search-result-row")).toHaveTextContent(
            "Alpha BluRay",
        );
        fireEvent.change(screen.getByTestId("freetext-filter-title"), {
            target: {value: "/[/"},
        });
        expect(
            screen.queryByTestId("search-result-row"),
        ).not.toBeInTheDocument();

        fireEvent.change(screen.getByTestId("freetext-filter-title"), {
            target: {value: ""},
        });
        fireEvent.change(screen.getByTestId("number-filter-min-size"), {
            target: {value: "4"},
        });
        expect(screen.getByTestId("search-result-row")).toHaveTextContent(
            "Zulu WEB",
        );
        fireEvent.click(screen.getByTestId("number-filter-clear-size"));
        expect(screen.getAllByTestId("search-result-row")).toHaveLength(2);

        const indexerFilter = within(
            screen.getByTestId("filter-toggle-indexer"),
        );
        fireEvent.click(indexerFilter.getByLabelText("One"));
        expect(screen.getByTestId("search-result-row")).toHaveTextContent(
            "Alpha BluRay",
        );
    });

    it("should visibly sort every sortable column", () => {
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 3,
                    searchResults: [
                        {
                            searchResultId: "1",
                            title: "Alpha",
                            indexer: "Beta",
                            category: "TV",
                            size: 5 * 1024 * 1024,
                            seeders: 10,
                            epoch: 3,
                        },
                        {
                            searchResultId: "2",
                            title: "Bravo",
                            indexer: "Alpha",
                            category: "Movies",
                            size: 2 * 1024 * 1024,
                            grabs: 3,
                            epoch: 1,
                        },
                        {
                            searchResultId: "3",
                            title: "Charlie",
                            indexer: "Gamma",
                            category: "Movies",
                            size: 7 * 1024 * 1024,
                            seeders: 7,
                            epoch: 2,
                        },
                    ],
                }}
            />,
        );

        for (const [column, direction, firstTitle] of [
            ["title", "asc", "Alpha"],
            ["indexer", "asc", "Bravo"],
            ["category", "asc", "Bravo"],
            ["size", "desc", "Charlie"],
            ["grabs", "desc", "Alpha"],
            ["epoch", "desc", "Alpha"],
        ]) {
            const sort = screen.getByTestId(`sort-${column}`);
            fireEvent.click(sort);
            expect(sort).toHaveAttribute("data-sort-direction", direction);
            expect(sort).toHaveTextContent(
                `(${direction === "asc" ? "ascending" : "descending"})`,
            );
            expect(
                screen.getAllByTestId("search-result-title")[0],
            ).toHaveTextContent(firstTitle);
        }
    });

    it("should render configured preselected quick filters", () => {
        window.__NZBHYDRA_BOOTSTRAP__ = {
            safeConfig: {
                searching: {
                    showQuickFilterButtons: true,
                    preselectQuickFilterButtons: ["source|web"],
                },
            },
        };
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 2,
                    searchResults: [
                        {
                            searchResultId: "1",
                            title: "WEB-DL release",
                            indexer: "One",
                            category: "Movies",
                        },
                        {
                            searchResultId: "2",
                            title: "BluRay release",
                            indexer: "Two",
                            category: "Movies",
                        },
                    ],
                }}
            />,
        );

        expect(screen.getByRole("button", {name: "WEB"})).toHaveAttribute(
            "aria-pressed",
            "true",
        );
        expect(screen.getByTestId("search-result-row")).toHaveTextContent(
            "WEB-DL release",
        );
    });

    it("should expand groups and support keyboard bulk and shift selection", () => {
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 3,
                    searchResults: [
                        {
                            searchResultId: "one",
                            title: "Example release",
                            indexer: "One",
                            category: "TV",
                            hash: 1,
                        },
                        {
                            searchResultId: "two",
                            title: "Example release",
                            indexer: "Two",
                            category: "TV",
                            hash: 1,
                        },
                        {
                            searchResultId: "three",
                            title: "Other release",
                            indexer: "Three",
                            category: "TV",
                            hash: 2,
                        },
                    ],
                }}
            />,
        );
        expect(screen.getAllByTestId("search-result-row")).toHaveLength(2);
        const expandDuplicates = screen.getByRole("button", {
            name: "Expand duplicates",
        });
        expandDuplicates.focus();
        fireEvent.keyDown(expandDuplicates, {key: "Enter"});
        expect(screen.getAllByTestId("search-result-row")).toHaveLength(3);
        const checkboxes = screen.getAllByRole("checkbox", {name: /Select/});
        checkboxes[0].focus();
        fireEvent.keyDown(checkboxes[0], {code: "Space", key: " "});
        checkboxes[2].focus();
        fireEvent.keyDown(checkboxes[2], {
            code: "Space",
            key: " ",
            shiftKey: true,
        });
        expect(checkboxes).toHaveLength(3);
        checkboxes.forEach((checkbox) => expect(checkbox).toBeChecked());
        const deselectAll = screen.getByRole("button", {name: "Deselect all"});
        deselectAll.focus();
        fireEvent.keyDown(deselectAll, {key: "Enter"});
        checkboxes.forEach((checkbox) => expect(checkbox).not.toBeChecked());
    });

    it("should confirm duplicate downloader sends before causing the send side effect", async () => {
        window.__NZBHYDRA_BOOTSTRAP__ = {
            baseUrl: "/",
            safeConfig: {
                downloading: {
                    downloaders: [
                        {name: "SAB", enabled: true, defaultCategory: "movies"},
                    ],
                },
            },
        };
        const fetchImplementation = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(JSON.stringify(["movies"]), {
                    headers: {"Content-Type": "application/json"},
                }),
            )
            .mockResolvedValueOnce(
                new Response(JSON.stringify({reasonRequired: true}), {
                    headers: {"Content-Type": "application/json"},
                }),
            )
            .mockResolvedValueOnce(
                new Response(
                    JSON.stringify({successful: true, addedIds: [1]}),
                    {headers: {"Content-Type": "application/json"}},
                ),
            );
        vi.stubGlobal("fetch", fetchImplementation);
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 1,
                    searchResults: [
                        {
                            searchResultId: "1",
                            title: "Movie",
                            indexer: "Mock",
                            category: "Movies",
                        },
                    ],
                }}
            />,
        );
        fireEvent.click(screen.getByRole("checkbox", {name: "Select Movie"}));
        fireEvent.click(
            screen.getByRole("button", {name: "Send selected to downloader"}),
        );
        expect(
            await screen.findByRole("dialog", {
                name: "Duplicate movie download",
            }),
        ).toBeVisible();
        expect(fetchImplementation).toHaveBeenCalledTimes(2);
        fireEvent.click(screen.getByRole("button", {name: "Send"}));
        await vi.waitFor(() =>
            expect(fetchImplementation).toHaveBeenCalledTimes(3),
        );
        expect(fetchImplementation.mock.calls[2][0]).toMatch(/addNzbs$/);
    });

    it("should render one base-aware direct torrent action using the preferred download ID and fallback", () => {
        window.__NZBHYDRA_BOOTSTRAP__ = {baseUrl: "/hydra/"};
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 3,
                    searchResults: [
                        {
                            searchResultId: "1",
                            title: "NZB",
                            indexer: "Mock",
                            category: "Movies",
                        },
                        {
                            searchResultId: "2",
                            title: "Torrent",
                            indexer: "Mock",
                            category: "Movies",
                            downloadType: "TORRENT",
                            downloadId: "torrent-download-id",
                        },
                        {
                            searchResultId: "torrent-result-id",
                            title: "Torrent fallback",
                            indexer: "Mock",
                            category: "Movies",
                            downloadType: "TORRENT",
                        },
                    ],
                }}
            />,
        );
        const rows = screen.getAllByTestId("search-result-row");
        expect(within(rows[0]).getAllByTestId("download-nzb")).toHaveLength(1);
        const preferredTorrentActions = within(rows[1]).getAllByTestId(
            "download-torrent",
        );
        expect(preferredTorrentActions).toHaveLength(1);
        expect(preferredTorrentActions[0]).toHaveAttribute(
            "href",
            "http://localhost:3000/hydra/gettorrent/user/torrent-download-id",
        );
        const fallbackTorrentActions = within(rows[2]).getAllByTestId(
            "download-torrent",
        );
        expect(fallbackTorrentActions).toHaveLength(1);
        expect(fallbackTorrentActions[0]).toHaveAttribute(
            "href",
            "http://localhost:3000/hydra/gettorrent/user/torrent-result-id",
        );
    });

    it("should preserve state and avoid sending when duplicate confirmation is cancelled", async () => {
        window.__NZBHYDRA_BOOTSTRAP__ = {
            baseUrl: "/",
            safeConfig: {
                downloading: {downloaders: [{name: "SAB", enabled: true}]},
            },
        };
        const fetchImplementation = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(JSON.stringify([]), {
                    headers: {"Content-Type": "application/json"},
                }),
            )
            .mockResolvedValueOnce(
                new Response(JSON.stringify({reasonRequired: true}), {
                    headers: {"Content-Type": "application/json"},
                }),
            );
        vi.stubGlobal("fetch", fetchImplementation);
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 1,
                    searchResults: [
                        {
                            searchResultId: "1",
                            title: "Movie",
                            indexer: "Mock",
                            category: "Movies",
                        },
                    ],
                }}
            />,
        );
        fireEvent.click(screen.getByRole("checkbox", {name: "Select Movie"}));
        fireEvent.click(
            screen.getByRole("button", {name: "Send selected to downloader"}),
        );
        fireEvent.click(await screen.findByRole("button", {name: "Cancel"}));
        expect(fetchImplementation).toHaveBeenCalledTimes(2);
        await vi.waitFor(() =>
            expect(
                screen.getByRole("checkbox", {name: "Select Movie"}),
            ).toBeChecked(),
        );
    });

    it("should provide accessible category-load failure feedback", async () => {
        window.__NZBHYDRA_BOOTSTRAP__ = {
            baseUrl: "/",
            safeConfig: {
                downloading: {downloaders: [{name: "SAB", enabled: true}]},
            },
        };
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(new Response("broken", {status: 500})),
        );
        renderResults(
            <SearchResults
                data={{
                    ...response,
                    numberOfAvailableResults: 1,
                    searchResults: [
                        {
                            searchResultId: "1",
                            title: "Movie",
                            indexer: "Mock",
                            category: "Movies",
                        },
                    ],
                }}
            />,
        );
        expect(
            await screen.findByText(/Unable to load downloader categories/),
        ).toBeVisible();
        expect(
            screen.getByRole("button", {name: "Send selected to downloader"}),
        ).toBeDisabled();
    });

    it("should send TORBOX results only to a TORBOX downloader", async () => {
        window.__NZBHYDRA_BOOTSTRAP__ = {
            baseUrl: "/",
            safeConfig: {
                downloading: {
                    downloaders: [
                        {
                            name: "Torbox",
                            enabled: true,
                            downloaderType: "TORBOX",
                        },
                    ],
                },
            },
        };
        const fetchImplementation = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(JSON.stringify([]), {
                    headers: {"Content-Type": "application/json"},
                }),
            )
            .mockResolvedValueOnce(
                new Response(JSON.stringify({reasonRequired: false}), {
                    headers: {"Content-Type": "application/json"},
                }),
            )
            .mockResolvedValueOnce(
                new Response(
                    JSON.stringify({successful: true, addedIds: [1]}),
                    {
                        headers: {"Content-Type": "application/json"},
                    },
                ),
            );
        vi.stubGlobal("fetch", fetchImplementation);
        renderResults(
            <SearchResults data={downloadActionResponse("TORBOX")} />,
        );
        fireEvent.click(
            screen.getByRole("checkbox", {name: "Select TORBOX result"}),
        );
        fireEvent.click(
            screen.getByRole("button", {name: "Send selected to downloader"}),
        );
        await vi.waitFor(() =>
            expect(fetchImplementation).toHaveBeenCalledTimes(3),
        );
        expect(fetchImplementation.mock.calls[2][1].body).toContain(
            '"searchResultId":"1"',
        );
    });

    it("should not send TORBOX results to an incompatible downloader", async () => {
        window.__NZBHYDRA_BOOTSTRAP__ = {
            baseUrl: "/",
            safeConfig: {
                downloading: {
                    downloaders: [
                        {name: "SAB", enabled: true, downloaderType: "SABNZBD"},
                    ],
                },
            },
        };
        const fetchImplementation = vi
            .fn()
            .mockResolvedValue(new Response(JSON.stringify([])));
        vi.stubGlobal("fetch", fetchImplementation);
        renderResults(
            <SearchResults data={downloadActionResponse("TORBOX")} />,
        );
        fireEvent.click(
            screen.getByRole("checkbox", {name: "Select TORBOX result"}),
        );
        fireEvent.click(
            screen.getByRole("button", {name: "Send selected to downloader"}),
        );
        expect(
            await screen.findByText(/None of the selected results can be sent/),
        ).toBeVisible();
        expect(fetchImplementation).toHaveBeenCalledTimes(1);
    });

    it("should exclude an all-TORBOX selection from ZIP and NZB black-hole actions", () => {
        window.__NZBHYDRA_BOOTSTRAP__ = {
            baseUrl: "/",
            safeConfig: {
                downloading: {saveNzbsTo: "/blackhole"},
                searching: {showResultsAsZipButton: true},
            },
        };
        const fetchImplementation = vi.fn();
        vi.stubGlobal("fetch", fetchImplementation);
        renderResults(
            <SearchResults data={downloadActionResponse("TORBOX")} />,
        );
        const selection = screen.getByRole("checkbox", {
            name: "Select TORBOX result",
        });
        fireEvent.click(selection);

        expect(
            screen.getByRole("button", {name: "Download selected NZBs as ZIP"}),
        ).toBeDisabled();
        fireEvent.click(
            screen.getByRole("button", {name: "Send selected to black hole"}),
        );

        expect(fetchImplementation).not.toHaveBeenCalled();
        expect(selection).toBeChecked();
    });

    it("should save selected NZBs to the black hole", async () => {
        window.__NZBHYDRA_BOOTSTRAP__ = {
            baseUrl: "/hydra/",
            safeConfig: {
                downloading: {
                    saveNzbsTo: "/blackhole",
                },
            },
        };
        const fetchImplementation = vi.fn().mockResolvedValueOnce(
            new Response(JSON.stringify({successful: true, addedIds: [1]}), {
                headers: {"Content-Type": "application/json"},
            }),
        );
        vi.stubGlobal("fetch", fetchImplementation);
        renderResults(<SearchResults data={downloadActionResponse("NZB")} />);
        fireEvent.click(
            screen.getByRole("checkbox", {name: "Select NZB result"}),
        );
        fireEvent.click(
            screen.getByRole("button", {name: "Send selected to black hole"}),
        );
        await vi.waitFor(() =>
            expect(fetchImplementation.mock.calls[0][0]).toMatch(
                /saveNzbsToBlackhole$/,
            ),
        );
    });

    it("should save selected torrents or magnets", async () => {
        window.__NZBHYDRA_BOOTSTRAP__ = {
            baseUrl: "/",
            safeConfig: {downloading: {saveTorrentsTo: "/torrents"}},
        };
        const fetchImplementation = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({successful: true, addedIds: [1]}), {
                headers: {"Content-Type": "application/json"},
            }),
        );
        vi.stubGlobal("fetch", fetchImplementation);
        renderResults(
            <SearchResults data={downloadActionResponse("TORRENT")} />,
        );
        fireEvent.click(
            screen.getByRole("checkbox", {name: "Select TORRENT result"}),
        );
        fireEvent.click(
            screen.getByRole("button", {name: "Send selected to black hole"}),
        );
        await vi.waitFor(() =>
            expect(fetchImplementation.mock.calls[0][0]).toMatch(
                /saveOrSendTorrents$/,
            ),
        );
    });

    it("should prepare and transfer a ZIP, then copy selected links", async () => {
        window.__NZBHYDRA_BOOTSTRAP__ = {
            baseUrl: "/hydra/",
            safeConfig: {searching: {showResultsAsZipButton: true}},
        };
        const clipboard = {writeText: vi.fn().mockResolvedValue(undefined)};
        vi.stubGlobal("navigator", {clipboard});
        const fetchImplementation = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(
                    JSON.stringify({
                        successful: true,
                        addedIds: [1],
                        zipFilepath: "zip-1",
                    }),
                    {headers: {"Content-Type": "application/json"}},
                ),
            )
            .mockResolvedValueOnce(new Response("zip contents"));
        vi.stubGlobal("fetch", fetchImplementation);
        vi.stubGlobal(
            "URL",
            Object.assign(URL, {
                createObjectURL: vi.fn().mockReturnValue("blob:zip"),
                revokeObjectURL: vi.fn(),
            }),
        );
        const click = vi
            .spyOn(HTMLAnchorElement.prototype, "click")
            .mockImplementation(() => {});
        renderResults(<SearchResults data={downloadActionResponse("NZB")} />);
        fireEvent.click(
            screen.getByRole("checkbox", {name: "Select NZB result"}),
        );
        fireEvent.click(
            screen.getByRole("button", {name: "Download selected NZBs as ZIP"}),
        );
        await vi.waitFor(() =>
            expect(fetchImplementation).toHaveBeenCalledTimes(2),
        );
        expect(fetchImplementation.mock.calls[1][0]).toMatch(/nzbzipDownload$/);
        expect(click).toHaveBeenCalled();
        fireEvent.click(
            screen.getByRole("checkbox", {name: "Select NZB result"}),
        );
        fireEvent.click(
            screen.getByRole("button", {name: "Copy selected links"}),
        );
        await vi.waitFor(() =>
            expect(clipboard.writeText).toHaveBeenCalledWith(
                "http://localhost:3000/hydra/getnzb/user/1",
            ),
        );
        click.mockRestore();
    });

    it("should reject a successful ZIP preparation response without a file path", async () => {
        window.__NZBHYDRA_BOOTSTRAP__ = {
            baseUrl: "/",
            safeConfig: {searching: {showResultsAsZipButton: true}},
        };
        const fetchImplementation = vi
            .fn()
            .mockResolvedValue(
                new Response(JSON.stringify({successful: true, addedIds: [1]})),
            );
        vi.stubGlobal("fetch", fetchImplementation);
        renderResults(<SearchResults data={downloadActionResponse("NZB")} />);
        fireEvent.click(
            screen.getByRole("checkbox", {name: "Select NZB result"}),
        );
        fireEvent.click(
            screen.getByRole("button", {name: "Download selected NZBs as ZIP"}),
        );
        expect(
            await screen.findByText("Unable to complete the download action."),
        ).toBeVisible();
        expect(fetchImplementation).toHaveBeenCalledTimes(1);
        expect(
            screen.getByRole("checkbox", {name: "Select NZB result"}),
        ).toBeChecked();
        expect(
            screen.queryByText("Prepared NZB ZIP download."),
        ).not.toBeInTheDocument();
    });
});

function downloadActionResponse(
    downloadType: "NZB" | "TORRENT" | "TORBOX",
    includeTorrent = false,
) {
    return {
        ...response,
        numberOfAvailableResults: includeTorrent ? 2 : 1,
        searchResults: includeTorrent
            ? [
                  {
                      searchResultId: "1",
                      title: "NZB result",
                      indexer: "Mock",
                      category: "Movies",
                      downloadType: "NZB",
                  },
                  {
                      searchResultId: "2",
                      title: `${downloadType} result`,
                      indexer: "Mock",
                      category: "Movies",
                      downloadType,
                  },
              ]
            : [
                  {
                      searchResultId: "1",
                      title: `${downloadType} result`,
                      indexer: "Mock",
                      category: "Movies",
                      downloadType,
                  },
              ],
    };
}
