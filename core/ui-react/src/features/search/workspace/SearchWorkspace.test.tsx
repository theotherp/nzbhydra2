import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import type {CategoryCatalog} from "../../../domain/categories/catalog";
import {createCategoryCatalog} from "../../../domain/categories/catalog";
import type {SearchFormValues} from "./searchFormModel";
import {
    canonicalSearch,
    nonIdentifierQueryText,
    valuesFromSearch,
} from "./searchFormModel";
import {SearchWorkspace} from "./SearchWorkspace";

const catalog = createCategoryCatalog({
    categoriesConfig: {
        defaultCategory: "All",
        enableCategorySizes: true,
        categories: [
            {
                name: "All",
                searchType: "SEARCH",
                minSizePreset: 10,
                maxSizePreset: 100,
            },
            {
                name: "Cinema",
                searchType: "MOVIE",
                minSizePreset: 20,
                maxSizePreset: 200,
            },
            {name: "Series", searchType: "TVSEARCH"},
        ],
    },
    indexers: [{name: "Mock", preselect: true}],
});

const emptyValues: SearchFormValues = {
    query: "",
    category: "All",
    minage: "",
    maxage: "",
    minsize: "",
    maxsize: "",
    title: "",
    additionalQuery: "",
    season: "",
    episode: "",
    imdbId: "",
    tmdbId: "",
    tvdbId: "",
    tvmazeId: "",
    tvrageId: "",
    indexers: [],
};

const selectionCatalog = createCategoryCatalog({
    categoriesConfig: {defaultCategory: "All", categories: [{name: "All"}]},
    indexers: [{name: "First", preselect: true}, {name: "Second"}],
});

function renderWorkspace(
    search: Record<string, unknown>,
    props: {
        catalog?: CategoryCatalog;
        indexerSelectionAsCheckboxes?: boolean;
        showIndexerSelection?: boolean;
    } = {},
) {
    const {catalog: workspaceCatalog = catalog, ...rest} = props;
    return render(
        <SearchWorkspace
            catalog={workspaceCatalog}
            initialValues={valuesFromSearch(search, workspaceCatalog)}
            onSubmit={vi.fn()}
            autocomplete={vi.fn()}
            {...rest}
        />,
    );
}

function deleteChip(testId: string) {
    const icon = screen
        .getByTestId(testId)
        .querySelector<HTMLElement>(".MuiChip-deleteIcon");
    expect(icon).not.toBeNull();
    fireEvent.click(icon as HTMLElement);
}

/**
 * This project's jsdom environment has no explicit `url` configured, which
 * leaves `window.localStorage` unavailable in every test (a jsdom "opaque
 * origin" limitation -- see the identical note in
 * `features/system/logs/SystemLogTab.test.tsx`). Installed fresh per test and
 * removed by `vi.unstubAllGlobals()`.
 */
function stubWorkingLocalStorage(): Map<string, string> {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
        get length() {
            return store.size;
        },
        clear: () => store.clear(),
        getItem: (key: string) =>
            store.has(key) ? (store.get(key) as string) : null,
        key: (index: number) => [...store.keys()][index] ?? null,
        removeItem: (key: string) => store.delete(key),
        setItem: (key: string, value: string) => {
            store.set(key, value);
        },
    } satisfies Storage);
    return store;
}

/** A browser that refuses site data: every access throws. */
function stubBlockedLocalStorage(): void {
    const blocked = () => {
        throw new Error("storage is blocked");
    };
    vi.stubGlobal("localStorage", {
        get length(): number {
            return blocked();
        },
        clear: blocked,
        getItem: blocked,
        key: blocked,
        removeItem: blocked,
        setItem: blocked,
    } satisfies Storage);
}

describe("SearchWorkspace", () => {
    let advancedOpenStore: Map<string, string>;

    beforeEach(() => {
        advancedOpenStore = stubWorkingLocalStorage();
    });

    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    it("should restore canonical URL values and category size presets", () => {
        expect(
            valuesFromSearch(
                {query: "hello", category: "Cinema", minage: "2"},
                catalog,
            ),
        ).toMatchObject({
            query: "hello",
            category: "Cinema",
            minage: "2",
            minsize: "20",
            maxsize: "200",
        });
        // `category: "Cinema"` (searchType MOVIE) with text in `query` and an
        // empty `title` is a combination the form itself cannot produce: the
        // visible `search-query` input registers to `title` for a media
        // category, never to `query` (FM-051). The reachable equivalent --
        // the text where the form actually puts it -- is `title: "hello"`,
        // `query: ""`; the corrected derivation reads that combination and
        // still resolves the canonical `query` param to "hello", so the
        // assertion below is unchanged.
        expect(
            canonicalSearch(
                {
                    query: "",
                    category: "Cinema",
                    minage: "",
                    maxage: "",
                    minsize: "",
                    maxsize: "",
                    title: "hello",
                    additionalQuery: "",
                    season: "",
                    episode: "",
                    imdbId: "",
                    tmdbId: "",
                    tvdbId: "",
                    tvmazeId: "",
                    tvrageId: "",
                    indexers: ["Mock"],
                },
                catalog,
            ),
        ).toEqual({query: "hello", category: "Cinema", indexers: "Mock"});
    });

    it("should restore and repeat identifier-backed media criteria", () => {
        const restored = valuesFromSearch(
            {
                query: "extended edition",
                category: "Cinema",
                title: "Example Movie",
                imdbId: "tt1234567",
                tmdbId: "42",
            },
            catalog,
        );
        expect(restored).toMatchObject({
            title: "Example Movie",
            additionalQuery: "extended edition",
            imdbId: "tt1234567",
            tmdbId: "42",
        });
        expect(canonicalSearch(restored, catalog)).toMatchObject({
            query: "extended edition",
            category: "Cinema",
            title: "Example Movie",
            imdbId: "tt1234567",
            tmdbId: "42",
        });
    });

    // FM-051: `nonIdentifierQueryText` is the single shared derivation for
    // which field's text a non-identifier search submits. It must always
    // select the field the visible `search-query` input is actually
    // registered to -- `title` for a media category, `query` otherwise --
    // and never fall back to the sibling field, even when that sibling
    // field still holds stale text mirrored or left over from an earlier
    // search in the same session.
    describe("nonIdentifierQueryText", () => {
        it("selects the query field for a non-media category, ignoring a stale mirrored title", () => {
            // The exact FM-051 defect input: a non-media category search
            // ("All") followed by a second, different search must submit
            // its own text ("beta"), not the stale "alpha" left in `title`
            // by `valuesFromSearch`'s query-into-title mirror.
            expect(
                nonIdentifierQueryText(
                    {
                        ...emptyValues,
                        category: "All",
                        query: "beta",
                        title: "alpha",
                    },
                    catalog,
                ),
            ).toBe("beta");
        });

        it("selects the title field for a media category, ignoring a stale query", () => {
            // The mirror of the defect: a media category ("Cinema") search
            // must submit its own text ("alpha"), not a stale "beta" left
            // in `query`.
            expect(
                nonIdentifierQueryText(
                    {
                        ...emptyValues,
                        category: "Cinema",
                        title: "alpha",
                        query: "beta",
                    },
                    catalog,
                ),
            ).toBe("alpha");
        });

        it("resolves to empty text for a non-media category with an empty box, ignoring a stale title", () => {
            expect(
                nonIdentifierQueryText(
                    {
                        ...emptyValues,
                        category: "All",
                        query: "",
                        title: "alpha",
                    },
                    catalog,
                ),
            ).toBe("");
        });

        it("resolves to empty text for a media category with an empty box, ignoring a stale query", () => {
            // This is the categoryChanged manifestation of the defect:
            // searching in "All", switching to "Cinema", and submitting an
            // empty box must not resurrect the "All" search's stale query.
            expect(
                nonIdentifierQueryText(
                    {
                        ...emptyValues,
                        category: "Cinema",
                        title: "",
                        query: "alpha",
                    },
                    catalog,
                ),
            ).toBe("");
        });

        it("resolves a TV media category the same way as a movie category", () => {
            expect(
                nonIdentifierQueryText(
                    {
                        ...emptyValues,
                        category: "Series",
                        title: "show",
                        query: "stale",
                    },
                    catalog,
                ),
            ).toBe("show");
        });
    });

    it("should have canonicalSearch resolve the URL's query param the same way, never the stale sibling field", () => {
        expect(
            canonicalSearch(
                {
                    ...emptyValues,
                    category: "All",
                    indexers: ["Mock"],
                    query: "beta",
                    title: "alpha",
                },
                catalog,
            ),
        ).toEqual({category: "All", query: "beta", indexers: "Mock"});
        expect(
            canonicalSearch(
                {
                    ...emptyValues,
                    category: "Cinema",
                    indexers: ["Mock"],
                    title: "alpha",
                    query: "beta",
                },
                catalog,
            ),
        ).toEqual({category: "Cinema", query: "alpha", indexers: "Mock"});
    });

    it("should not resubmit a stale query after switching from a non-media to a media category with an empty box", async () => {
        // FM-051's second manifestation: `categoryChanged` clears `title`
        // but never `query`. Searching in "All" (which fills `query`),
        // switching to "Cinema" (a media category, whose box is bound to
        // `title`), and submitting the now-empty box must not resurrect the
        // "All" search's stale `query` text -- the shared derivation never
        // reads `query` for a media category, so it does not matter that
        // `categoryChanged` leaves it untouched.
        const submitted = vi.fn();
        render(
            <SearchWorkspace
                catalog={catalog}
                initialValues={valuesFromSearch({}, catalog)}
                onSubmit={submitted}
                autocomplete={vi.fn()}
            />,
        );
        fireEvent.change(screen.getByTestId("search-query"), {
            target: {value: "fm051 stale all query"},
        });
        fireEvent.mouseDown(screen.getByRole("combobox", {name: "Category"}));
        fireEvent.click(screen.getByTestId("search-category-option-Cinema"));
        expect(screen.getByTestId("search-query")).toHaveValue("");
        fireEvent.click(screen.getByTestId("search-submit"));
        await waitFor(() =>
            expect(submitted.mock.calls[0]?.[0]).toEqual(
                expect.objectContaining({
                    category: "Cinema",
                    title: "",
                    query: "fm051 stale all query",
                }),
            ),
        );
        expect(
            canonicalSearch(submitted.mock.calls[0][0], catalog).query,
        ).toBeUndefined();
    });

    it("should move focus to the search query field after a category selection", () => {
        render(
            <SearchWorkspace
                catalog={catalog}
                initialValues={valuesFromSearch({}, catalog)}
                onSubmit={vi.fn()}
                autocomplete={vi.fn()}
            />,
        );
        fireEvent.mouseDown(screen.getByRole("combobox", {name: "Category"}));
        fireEvent.click(screen.getByTestId("search-category-option-Cinema"));
        expect(screen.getByTestId("search-query")).toHaveFocus();
    });

    it("should submit valid numeric criteria", async () => {
        const submitted = vi.fn();
        render(
            <SearchWorkspace
                catalog={catalog}
                initialValues={valuesFromSearch({}, catalog)}
                onSubmit={submitted}
                autocomplete={vi.fn()}
            />,
        );
        fireEvent.change(screen.getByLabelText("Search"), {
            target: {value: "hello"},
        });
        fireEvent.change(screen.getByLabelText("Min age"), {
            target: {value: "3"},
        });
        fireEvent.click(screen.getByTestId("search-submit"));
        await waitFor(() =>
            expect(submitted.mock.calls[0]?.[0]).toEqual(
                expect.objectContaining({query: "hello", minage: "3"}),
            ),
        );
    });

    it("should keep the age and size ranges behind the collapsed Advanced disclosure", async () => {
        const submitted = vi.fn();
        render(
            <SearchWorkspace
                catalog={catalog}
                initialValues={valuesFromSearch({}, catalog)}
                onSubmit={submitted}
                autocomplete={vi.fn()}
            />,
        );

        const toggle = screen.getByTestId("search-advanced-toggle");
        const panel = screen.getByTestId("search-advanced-panel");
        expect(toggle).toHaveAttribute("aria-expanded", "false");
        expect(toggle).toHaveAttribute("aria-controls", panel.id);
        expect(panel).not.toBeVisible();
        expect(panel).toContainElement(screen.getByTestId("workspace-ranges"));

        fireEvent.click(toggle);
        expect(toggle).toHaveAttribute("aria-expanded", "true");
        expect(panel).toBeVisible();
        for (const label of ["Min age", "Max age", "Min size", "Max size"]) {
            expect(screen.getByLabelText(label)).toBeVisible();
        }

        fireEvent.change(screen.getByLabelText("Max size"), {
            target: {value: "512"},
        });
        fireEvent.click(screen.getByTestId("search-submit"));
        await waitFor(() =>
            expect(submitted.mock.calls[0]?.[0]).toEqual(
                expect.objectContaining({maxsize: "512"}),
            ),
        );

        fireEvent.click(toggle);
        expect(toggle).toHaveAttribute("aria-expanded", "false");
        // FM-087 made the panel a `Collapse`, which hides itself only once
        // its 300ms collapse transition has run, so the same "not visible"
        // fact is now awaited rather than asserted synchronously.
        await waitFor(() => expect(panel).not.toBeVisible());
    });

    // FM-087 rewrote this case: the season/episode pair and the additional
    // filter left the input row for the Advanced panel's Media section, so
    // the containment it asserts moved with them. What it exists to prove --
    // that the pair is one labeled two-field block rendered after the query
    // input, inside the same bar surface -- is asserted unchanged.
    it("should render the season and episode pair with the additional filter in the panel's media section", () => {
        render(
            <SearchWorkspace
                catalog={catalog}
                initialValues={valuesFromSearch({category: "Series"}, catalog)}
                onSubmit={vi.fn()}
                autocomplete={vi.fn()}
            />,
        );

        const row = screen.getByTestId("workspace-primary");
        const media = screen.getByTestId("workspace-media-refinement");
        const pair = screen.getByTestId("season-episode-pair");
        expect(row).toContainElement(screen.getByTestId("search-query"));
        expect(row).toContainElement(screen.getByTestId("search-submit"));
        expect(screen.getByTestId("search-advanced-panel")).toContainElement(
            media,
        );
        expect(media).toContainElement(pair);
        expect(media).toContainElement(screen.getByTestId("additional-query"));
        expect(pair).toContainElement(screen.getByLabelText("Season"));
        expect(pair).toContainElement(screen.getByLabelText("Episode"));
        expect(pair).toHaveTextContent("S");
        expect(pair).toHaveTextContent("E");
        expect(
            screen.getByTestId("search-query").compareDocumentPosition(pair) &
                Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
    });

    // Measured at 3867-4229ms under a full-suite run on an idle machine, against
    // vitest's 5000ms default -- about 20% headroom, which a shared CI runner
    // erases: this test timed out in Frontend CI runs 33240363775 and
    // 33247900241 while passing everywhere else. It is slow, not racing (it
    // completes with margin to spare locally, and a race would fail regardless
    // of the budget), so the budget is stated rather than the test loosened. A
    // genuine hang still fails it, just later.
    it(
        "should reconcile URL selections and support checkbox bulk selection actions",
        {timeout: 30_000},
        async () => {
            const indexerCatalog = createCategoryCatalog({
                categoriesConfig: {
                    defaultCategory: "All",
                    categories: [
                        {name: "All"},
                        {name: "Movies"},
                        {name: "Series"},
                    ],
                },
                indexers: [
                    {name: "Usenet", preselect: true, groupNames: ["Primary"]},
                    {
                        name: "Torrent",
                        searchModuleType: "TORZNAB",
                        groupNames: ["Secondary"],
                    },
                    {name: "Movies only", categories: ["Movies"]},
                ],
            });
            const submitted = vi.fn();
            const indexerNames = ["Movies only", "Torrent", "Usenet"];
            const expectSelectedIndexerNames = (names: string[]) => {
                for (const name of indexerNames) {
                    const checkbox = expect(
                        screen.getByRole("checkbox", {name}),
                    );
                    if (names.includes(name)) {
                        checkbox.toBeChecked();
                    } else {
                        checkbox.not.toBeChecked();
                    }
                }
            };
            expect(
                valuesFromSearch(
                    {category: "All", indexers: "Torrent,missing"},
                    indexerCatalog,
                ).indexers,
            ).toEqual(["Torrent"]);
            render(
                <SearchWorkspace
                    catalog={indexerCatalog}
                    initialValues={valuesFromSearch(
                        {category: "Movies", indexers: "Movies only,Usenet"},
                        indexerCatalog,
                    )}
                    onSubmit={submitted}
                    showIndexerSelection
                    indexerSelectionAsCheckboxes
                />,
            );
            // FM-087 moved the indexer selection into the Advanced panel; a
            // collapsed `Collapse` is hidden from the accessibility tree, so the
            // panel is opened before the (unchanged) selection semantics below
            // are exercised through role queries.
            fireEvent.click(screen.getByTestId("search-advanced-toggle"));

            const openIndexerMenu = () =>
                fireEvent.click(
                    screen.getByRole("button", {
                        name: "More selection options",
                    }),
                );

            expectSelectedIndexerNames(["Movies only", "Usenet"]);
            openIndexerMenu();
            fireEvent.click(screen.getByRole("menuitem", {name: "Select all"}));
            expectSelectedIndexerNames(["Movies only", "Torrent", "Usenet"]);
            openIndexerMenu();
            fireEvent.click(
                screen.getByRole("menuitem", {name: "Deselect all"}),
            );
            expectSelectedIndexerNames([]);
            fireEvent.click(
                screen.getByRole("button", {name: "Invert selection"}),
            );
            expectSelectedIndexerNames(["Movies only", "Torrent", "Usenet"]);
            openIndexerMenu();
            fireEvent.click(
                screen.getByRole("menuitem", {name: "Reset to preselection"}),
            );
            expectSelectedIndexerNames(["Usenet"]);
            openIndexerMenu();
            fireEvent.click(
                screen.getByRole("menuitem", {
                    name: "Select all usenet indexers",
                }),
            );
            expectSelectedIndexerNames(["Movies only", "Usenet"]);
            openIndexerMenu();
            fireEvent.click(
                screen.getByRole("menuitem", {
                    name: "Select all torznab indexers",
                }),
            );
            expectSelectedIndexerNames(["Torrent"]);
            openIndexerMenu();
            expect(screen.getByText("Indexer groups")).toBeVisible();
            fireEvent.click(
                screen.getByRole("menuitem", {name: "Select group Primary"}),
            );
            expectSelectedIndexerNames(["Usenet"]);

            openIndexerMenu();
            fireEvent.click(screen.getByRole("menuitem", {name: "Select all"}));
            expectSelectedIndexerNames(["Movies only", "Torrent", "Usenet"]);
            fireEvent.mouseDown(
                screen.getByRole("combobox", {name: "Category"}),
            );
            fireEvent.click(
                screen.getByTestId("search-category-option-Series"),
            );
            expect(
                screen.queryByRole("checkbox", {name: "Movies only"}),
            ).toBeNull();
            expect(
                screen.getByRole("checkbox", {name: "Torrent"}),
            ).toBeChecked();
            expect(
                screen.getByRole("checkbox", {name: "Usenet"}),
            ).toBeChecked();
            fireEvent.click(screen.getByTestId("search-submit"));
            await waitFor(() =>
                expect(submitted.mock.calls[0]?.[0]).toEqual(
                    expect.objectContaining({indexers: ["Torrent", "Usenet"]}),
                ),
            );
        },
    );

    it("should present and update an accessible dropdown selection", () => {
        const indexerCatalog = createCategoryCatalog({
            categoriesConfig: {
                defaultCategory: "All",
                categories: [{name: "All"}],
            },
            indexers: [{name: "First", preselect: true}, {name: "Second"}],
        });
        render(
            <SearchWorkspace
                catalog={indexerCatalog}
                initialValues={valuesFromSearch({}, indexerCatalog)}
                onSubmit={vi.fn()}
                showIndexerSelection
            />,
        );

        fireEvent.click(screen.getByTestId("search-advanced-toggle"));
        fireEvent.mouseDown(screen.getByRole("combobox", {name: "Indexers"}));
        const second = screen.getByRole("option", {name: "Second"});
        expect(second).toHaveAttribute("aria-selected", "false");
        fireEvent.click(second);
        expect(screen.getByRole("option", {name: "Second"})).toHaveAttribute(
            "aria-selected",
            "true",
        );
    });

    it("should select autocomplete results with the keyboard and clear stale identifiers on edit", async () => {
        const autocomplete = vi
            .fn()
            .mockResolvedValue([{title: "Example Movie", tmdbId: "42"}]);
        render(
            <SearchWorkspace
                catalog={catalog}
                initialValues={valuesFromSearch({category: "Cinema"}, catalog)}
                onSubmit={vi.fn()}
                autocomplete={autocomplete}
            />,
        );
        const input = screen.getByTestId("search-query");
        fireEvent.change(input, {target: {value: "Example"}});
        await waitFor(() =>
            expect(screen.getByTestId("autocomplete-option")).toBeVisible(),
        );
        expect(autocomplete).toHaveBeenCalledWith("MOVIE", "Example");
        fireEvent.keyDown(input, {key: "ArrowDown"});
        fireEvent.keyDown(input, {key: "Enter"});
        expect(screen.getByTestId("additional-query")).toBeEnabled();
        fireEvent.change(input, {target: {value: "Different"}});
        expect(screen.getByTestId("additional-query")).toBeDisabled();
    });

    it("should show a suggestion's cover to the left of its title, and no image at all for a suggestion without one", async () => {
        const autocomplete = vi.fn().mockResolvedValue([
            {
                title: "Example Movie",
                tmdbId: "42",
                posterUrl: "https://example.com/poster.jpg",
            },
            {title: "No Cover Movie", tmdbId: "43"},
        ]);
        render(
            <SearchWorkspace
                catalog={catalog}
                initialValues={valuesFromSearch({category: "Cinema"}, catalog)}
                onSubmit={vi.fn()}
                autocomplete={autocomplete}
            />,
        );
        const input = screen.getByTestId("search-query");
        fireEvent.change(input, {target: {value: "Example"}});
        await waitFor(() =>
            expect(screen.getAllByTestId("autocomplete-option")).toHaveLength(
                2,
            ),
        );
        const [withCover, withoutCover] = screen.getAllByTestId(
            "autocomplete-option",
        );
        const cover = withCover.querySelector("img");
        expect(cover).toHaveAttribute("src", "https://example.com/poster.jpg");
        // "To the left of the title" -- the image is the option's first
        // child, before the title text.
        expect(withCover.firstElementChild).toBe(cover);
        expect(withoutCover.querySelector("img")).not.toBeInTheDocument();
    });

    it("should close the autocomplete dropdown when the search field loses focus", async () => {
        const autocomplete = vi
            .fn()
            .mockResolvedValue([{title: "Example Movie", tmdbId: "42"}]);
        render(
            <SearchWorkspace
                catalog={catalog}
                initialValues={valuesFromSearch({category: "Cinema"}, catalog)}
                onSubmit={vi.fn()}
                autocomplete={autocomplete}
            />,
        );
        const input = screen.getByTestId("search-query");
        fireEvent.change(input, {target: {value: "Example"}});
        await waitFor(() =>
            expect(screen.getByTestId("autocomplete-popup")).toBeVisible(),
        );
        fireEvent.blur(input);
        expect(
            screen.queryByTestId("autocomplete-popup"),
        ).not.toBeInTheDocument();
    });

    it("should close the autocomplete dropdown when the user clicks anywhere else, but not when clicking a suggestion", async () => {
        const autocomplete = vi
            .fn()
            .mockResolvedValue([{title: "Example Movie", tmdbId: "42"}]);
        render(
            <SearchWorkspace
                catalog={catalog}
                initialValues={valuesFromSearch({category: "Cinema"}, catalog)}
                onSubmit={vi.fn()}
                autocomplete={autocomplete}
            />,
        );
        const input = screen.getByTestId("search-query");
        fireEvent.change(input, {target: {value: "Example"}});
        await waitFor(() =>
            expect(screen.getByTestId("autocomplete-popup")).toBeVisible(),
        );
        // `waitFor` resolves as soon as the popup's DOM mutation is
        // observed, which happens at commit time -- strictly before React
        // flushes the *passive* effect that attaches this dropdown's own
        // outside-mousedown listener (`SearchWorkspace.tsx`'s
        // `closeIfOutside`, installed by a `useEffect` keyed on
        // `suggestions.length`). Under real contention that gap is briefly
        // observable: a mousedown fired immediately after `waitFor`
        // resolves can land before the listener exists, so the "close on
        // outside click" half of this test would then pass or fail on
        // nothing but scheduler luck. A real pointer click can never be
        // fast enough to land inside that gap -- passive effects always
        // flush well before human reaction time -- so this is a test
        // synchronization gap, not a product race. `act`'s async form
        // forces React to flush any pending passive effects synchronously,
        // making "the listener is attached" a guarantee instead of a race,
        // without touching either assertion below.
        await act(async () => {});
        // A mousedown on the option itself must not close the dropdown out
        // from under the option's own click handler.
        fireEvent.mouseDown(screen.getByTestId("autocomplete-option"));
        expect(screen.getByTestId("autocomplete-popup")).toBeVisible();

        fireEvent.mouseDown(document.body);
        expect(
            screen.queryByTestId("autocomplete-popup"),
        ).not.toBeInTheDocument();
    });

    it("should ignore a deferred autocomplete response after selecting a suggestion", async () => {
        let resolveDeferred: (
            suggestions: Array<{title: string; tmdbId: string}>,
        ) => void = () => undefined;
        const autocomplete = vi
            .fn()
            .mockResolvedValueOnce([{title: "Selected Movie", tmdbId: "1"}])
            .mockImplementationOnce(
                () =>
                    new Promise<Array<{title: string; tmdbId: string}>>(
                        (resolve) => (resolveDeferred = resolve),
                    ),
            );
        render(
            <SearchWorkspace
                catalog={catalog}
                initialValues={valuesFromSearch({category: "Cinema"}, catalog)}
                onSubmit={vi.fn()}
                autocomplete={autocomplete}
            />,
        );
        const input = screen.getByTestId("search-query");
        fireEvent.change(input, {target: {value: "Selected"}});
        await screen.findByTestId("autocomplete-option");
        fireEvent.change(input, {target: {value: "Selected Movie"}});
        await waitFor(() => expect(autocomplete).toHaveBeenCalledTimes(2));
        fireEvent.click(screen.getByTestId("autocomplete-option"));
        resolveDeferred([{title: "Stale Movie", tmdbId: "2"}]);
        await waitFor(() =>
            expect(screen.queryByText("Stale Movie")).not.toBeInTheDocument(),
        );
    });

    it("should use a nonliteral TV category search type for autocomplete and refinement", async () => {
        const autocomplete = vi
            .fn()
            .mockResolvedValue([{title: "Example Series", tvdbId: "7"}]);
        render(
            <SearchWorkspace
                catalog={catalog}
                initialValues={valuesFromSearch({category: "Series"}, catalog)}
                onSubmit={vi.fn()}
                autocomplete={autocomplete}
            />,
        );

        fireEvent.change(screen.getByTestId("search-query"), {
            target: {value: "Example"},
        });

        await screen.findByTestId("autocomplete-option");
        expect(autocomplete).toHaveBeenCalledWith("TV", "Example");
        // FM-087: Season and Episode moved into the Advanced panel, so their
        // visibility is asserted where they now render rather than in the
        // input row.
        fireEvent.click(screen.getByTestId("search-advanced-toggle"));
        expect(screen.getByLabelText("Season")).toBeVisible();
        expect(screen.getByLabelText("Episode")).toBeVisible();
    });

    it("should ignore a deferred autocomplete response after a category change", async () => {
        let resolveDeferred: (
            suggestions: Array<{title: string; tmdbId: string}>,
        ) => void = () => undefined;
        const autocomplete = vi.fn(
            () =>
                new Promise<Array<{title: string; tmdbId: string}>>(
                    (resolve) => (resolveDeferred = resolve),
                ),
        );
        render(
            <SearchWorkspace
                catalog={catalog}
                initialValues={valuesFromSearch({category: "Cinema"}, catalog)}
                onSubmit={vi.fn()}
                autocomplete={autocomplete}
            />,
        );

        fireEvent.change(screen.getByTestId("search-query"), {
            target: {value: "Example"},
        });
        await waitFor(() => expect(autocomplete).toHaveBeenCalledOnce());
        fireEvent.mouseDown(screen.getByRole("combobox", {name: "Category"}));
        fireEvent.click(screen.getByTestId("search-category-option-All"));
        resolveDeferred([{title: "Stale Movie", tmdbId: "2"}]);

        await waitFor(() =>
            expect(screen.queryByText("Stale Movie")).not.toBeInTheDocument(),
        );
    });

    it("should ignore a deferred autocomplete response after the title becomes too short", async () => {
        let resolveDeferred: (
            suggestions: Array<{title: string; tmdbId: string}>,
        ) => void = () => undefined;
        const autocomplete = vi.fn(
            () =>
                new Promise<Array<{title: string; tmdbId: string}>>(
                    (resolve) => (resolveDeferred = resolve),
                ),
        );
        render(
            <SearchWorkspace
                catalog={catalog}
                initialValues={valuesFromSearch({category: "Cinema"}, catalog)}
                onSubmit={vi.fn()}
                autocomplete={autocomplete}
            />,
        );

        const input = screen.getByTestId("search-query");
        fireEvent.change(input, {target: {value: "Example"}});
        await waitFor(() => expect(autocomplete).toHaveBeenCalledOnce());
        fireEvent.change(input, {target: {value: "E"}});
        resolveDeferred([{title: "Stale Movie", tmdbId: "2"}]);

        await waitFor(() =>
            expect(screen.queryByText("Stale Movie")).not.toBeInTheDocument(),
        );
    });

    // FM-087: the Advanced disclosure remembers itself between visits, so a
    // user who works with the panel open does not reopen it on every search.
    describe("Advanced disclosure", () => {
        it("should be an icon-only toggle that controls the collapsible panel", () => {
            renderWorkspace({});

            const toggle = screen.getByRole("button", {name: "Advanced"});
            const panel = screen.getByTestId("search-advanced-panel");
            expect(toggle).toBe(screen.getByTestId("search-advanced-toggle"));
            expect(toggle).toHaveAttribute("aria-expanded", "false");
            expect(toggle).toHaveAttribute("aria-controls", panel.id);
            expect(toggle).toHaveTextContent("");

            fireEvent.click(toggle);
            expect(toggle).toHaveAttribute("aria-expanded", "true");
            expect(panel).toBeVisible();
        });

        it("should restore the remembered open state and record every toggle", () => {
            advancedOpenStore.set("nzbhydra.search.advancedOpen", "true");
            renderWorkspace({});

            const toggle = screen.getByTestId("search-advanced-toggle");
            expect(toggle).toHaveAttribute("aria-expanded", "true");
            expect(screen.getByTestId("search-advanced-panel")).toBeVisible();

            fireEvent.click(toggle);
            expect(advancedOpenStore.get("nzbhydra.search.advancedOpen")).toBe(
                "false",
            );
            fireEvent.click(toggle);
            expect(advancedOpenStore.get("nzbhydra.search.advancedOpen")).toBe(
                "true",
            );
        });

        it("should start closed when the store is blocked, and still toggle", () => {
            stubBlockedLocalStorage();
            renderWorkspace({});

            const toggle = screen.getByTestId("search-advanced-toggle");
            expect(toggle).toHaveAttribute("aria-expanded", "false");
            fireEvent.click(toggle);
            expect(toggle).toHaveAttribute("aria-expanded", "true");
            expect(screen.getByTestId("search-advanced-panel")).toBeVisible();
        });

        it("should not record the panel opened by a chip", () => {
            renderWorkspace({category: "Series", season: "3"});

            fireEvent.click(screen.getByTestId("search-chip-season"));
            expect(screen.getByTestId("search-advanced-panel")).toBeVisible();
            expect(advancedOpenStore.has("nzbhydra.search.advancedOpen")).toBe(
                false,
            );
        });
    });

    // FM-087: every constraint that affects the search but has no field in
    // the input row is a live chip, so nothing is hidden behind the
    // collapsed panel. Each chip opens Advanced on its own field, and each
    // clearable one clears exactly its own constraint.
    describe("constraint chips", () => {
        it("should render the reserved chips row with no chips for a search with no constraints", () => {
            // FM-143: the row itself always renders (its space is reserved
            // so a later chip cannot shift the layout below it); only the
            // chips inside it are conditional.
            renderWorkspace({category: "Series"});

            expect(screen.getByTestId("search-chips")).toBeInTheDocument();
            for (const chip of [
                "search-chip-title",
                "search-chip-season",
                "search-chip-episode",
                "search-chip-age",
                "search-chip-size",
                "search-chip-filter",
                "search-chip-indexers",
            ]) {
                expect(screen.queryByTestId(chip)).not.toBeInTheDocument();
            }
        });

        it("should render a chip inside the same reserved container once a constraint is set", () => {
            renderWorkspace({category: "Series", season: "3"});

            const chipsRow = screen.getByTestId("search-chips");
            expect(chipsRow).toContainElement(
                screen.getByTestId("search-chip-season"),
            );
        });

        it("should show the matched title, focus the additional filter, and clear the identifiers", () => {
            renderWorkspace({
                category: "Cinema",
                title: "Example Movie",
                imdbId: "tt1234567",
            });

            const chip = screen.getByTestId("search-chip-title");
            expect(chip).toHaveTextContent("● Example Movie");
            fireEvent.click(chip);
            expect(screen.getByTestId("search-advanced-panel")).toBeVisible();
            expect(screen.getByTestId("additional-query")).toHaveFocus();

            deleteChip("search-chip-title");
            expect(
                screen.queryByTestId("search-chip-title"),
            ).not.toBeInTheDocument();
            expect(screen.getByTestId("additional-query")).toBeDisabled();
        });

        it("should show a chosen suggestion's year beside its title", async () => {
            const autocomplete = vi
                .fn()
                .mockResolvedValue([
                    {title: "Example Movie", tmdbId: "42", year: 2008},
                ]);
            render(
                <SearchWorkspace
                    catalog={catalog}
                    initialValues={valuesFromSearch(
                        {category: "Cinema"},
                        catalog,
                    )}
                    onSubmit={vi.fn()}
                    autocomplete={autocomplete}
                />,
            );

            fireEvent.change(screen.getByTestId("search-query"), {
                target: {value: "Example"},
            });
            fireEvent.click(await screen.findByTestId("autocomplete-option"));
            expect(screen.getByTestId("search-chip-title")).toHaveTextContent(
                "● Example Movie (2008)",
            );
        });

        it("should show, focus, and clear the season and episode", () => {
            renderWorkspace({category: "Series", season: "1", episode: "2"});

            expect(screen.getByTestId("search-chip-season")).toHaveTextContent(
                "S 1",
            );
            expect(screen.getByTestId("search-chip-episode")).toHaveTextContent(
                "E 2",
            );

            fireEvent.click(screen.getByTestId("search-chip-season"));
            expect(screen.getByLabelText("Season")).toHaveFocus();
            fireEvent.click(screen.getByTestId("search-chip-episode"));
            expect(screen.getByLabelText("Episode")).toHaveFocus();

            deleteChip("search-chip-season");
            expect(screen.getByLabelText("Season")).toHaveValue("");
            expect(
                screen.queryByTestId("search-chip-season"),
            ).not.toBeInTheDocument();
            deleteChip("search-chip-episode");
            expect(screen.getByLabelText("Episode")).toHaveValue("");
            expect(
                screen.queryByTestId("search-chip-episode"),
            ).not.toBeInTheDocument();
        });

        it("should label a two-sided and a one-sided age range", () => {
            renderWorkspace({category: "Series", minage: "10", maxage: "100"});
            expect(screen.getByTestId("search-chip-age")).toHaveTextContent(
                "Age 10–100 d",
            );

            cleanup();
            renderWorkspace({category: "Series", maxage: "100"});
            expect(screen.getByTestId("search-chip-age")).toHaveTextContent(
                "Age ≤ 100 d",
            );

            cleanup();
            renderWorkspace({category: "Series", minage: "10"});
            expect(screen.getByTestId("search-chip-age")).toHaveTextContent(
                "Age ≥ 10 d",
            );
        });

        it("should label a two-sided and a one-sided size range", () => {
            renderWorkspace({
                category: "Series",
                minsize: "500",
                maxsize: "8000",
            });
            expect(screen.getByTestId("search-chip-size")).toHaveTextContent(
                "Size 500–8000 MB",
            );

            cleanup();
            renderWorkspace({category: "Series", maxsize: "8000"});
            expect(screen.getByTestId("search-chip-size")).toHaveTextContent(
                "Size ≤ 8000 MB",
            );

            cleanup();
            renderWorkspace({category: "Series", minsize: "500"});
            expect(screen.getByTestId("search-chip-size")).toHaveTextContent(
                "Size ≥ 500 MB",
            );
        });

        it("should focus the minimum field and clear both bounds of a range", () => {
            renderWorkspace({
                category: "Series",
                minage: "10",
                maxage: "100",
                minsize: "500",
                maxsize: "8000",
            });

            fireEvent.click(screen.getByTestId("search-chip-age"));
            expect(screen.getByTestId("search-advanced-panel")).toBeVisible();
            expect(screen.getByLabelText("Min age")).toHaveFocus();
            fireEvent.click(screen.getByTestId("search-chip-size"));
            expect(screen.getByLabelText("Min size")).toHaveFocus();

            deleteChip("search-chip-age");
            expect(screen.getByLabelText("Min age")).toHaveValue("");
            expect(screen.getByLabelText("Max age")).toHaveValue("");
            expect(
                screen.queryByTestId("search-chip-age"),
            ).not.toBeInTheDocument();
            deleteChip("search-chip-size");
            expect(screen.getByLabelText("Min size")).toHaveValue("");
            expect(screen.getByLabelText("Max size")).toHaveValue("");
            expect(
                screen.queryByTestId("search-chip-size"),
            ).not.toBeInTheDocument();
        });

        it("should surface a category's size presets as the size chip as soon as the category is chosen", () => {
            renderWorkspace({category: "Series"});

            expect(
                screen.queryByTestId("search-chip-size"),
            ).not.toBeInTheDocument();
            fireEvent.mouseDown(
                screen.getByRole("combobox", {name: "Category"}),
            );
            fireEvent.click(
                screen.getByTestId("search-category-option-Cinema"),
            );
            expect(screen.getByTestId("search-chip-size")).toHaveTextContent(
                "Size 20–200 MB",
            );
        });

        it("should show, focus, and clear the additional filter", () => {
            renderWorkspace({
                category: "Cinema",
                title: "Example Movie",
                query: "1080p",
                imdbId: "tt1234567",
            });

            expect(screen.getByTestId("search-chip-filter")).toHaveTextContent(
                "Filter: 1080p",
            );
            fireEvent.click(screen.getByTestId("search-chip-filter"));
            expect(screen.getByTestId("additional-query")).toHaveFocus();

            deleteChip("search-chip-filter");
            expect(screen.getByTestId("additional-query")).toHaveValue("");
            expect(
                screen.queryByTestId("search-chip-filter"),
            ).not.toBeInTheDocument();
        });

        it("should count a partial indexer selection, open the section, and never offer a delete", () => {
            renderWorkspace(
                {category: "All", indexers: "First"},
                {catalog: selectionCatalog, showIndexerSelection: true},
            );

            const chip = screen.getByTestId("search-chip-indexers");
            expect(chip).toHaveTextContent("Indexers 1/2");
            expect(chip).not.toHaveClass("MuiChip-colorWarning");
            expect(chip.querySelector(".MuiChip-deleteIcon")).toBeNull();

            fireEvent.click(chip);
            expect(screen.getByTestId("search-advanced-panel")).toBeVisible();
            expect(
                screen.getByRole("combobox", {name: "Indexers"}),
            ).toHaveFocus();
        });

        it("should not count a full selection, and warn about an empty one", () => {
            renderWorkspace(
                {category: "All", indexers: "First,Second"},
                {catalog: selectionCatalog, showIndexerSelection: true},
            );
            expect(
                screen.queryByTestId("search-chip-indexers"),
            ).not.toBeInTheDocument();

            cleanup();
            renderWorkspace(
                {category: "All", indexers: ""},
                {catalog: selectionCatalog, showIndexerSelection: true},
            );
            const chip = screen.getByTestId("search-chip-indexers");
            expect(chip).toHaveTextContent("Indexers 0/2");
            expect(chip).toHaveClass("MuiChip-colorWarning");
        });

        it("should not count indexers at all when the selection is not shown", () => {
            renderWorkspace(
                {category: "All", indexers: "First"},
                {catalog: selectionCatalog},
            );

            expect(
                screen.queryByTestId("search-chip-indexers"),
            ).not.toBeInTheDocument();
        });

        it("should focus the first indexer checkbox when the selection renders as checkboxes", () => {
            renderWorkspace(
                {category: "All", indexers: "First"},
                {
                    catalog: selectionCatalog,
                    indexerSelectionAsCheckboxes: true,
                    showIndexerSelection: true,
                },
            );

            fireEvent.click(screen.getByTestId("search-chip-indexers"));
            expect(screen.getByRole("checkbox", {name: "First"})).toHaveFocus();
        });
    });

    // FM-087: the additional filter and Season both live in the Advanced
    // panel now, so choosing a suggestion has to expand the panel before it
    // moves focus -- focusing into a collapsed `Collapse` is a silent no-op.
    it("should open Advanced on Season after a TV suggestion is chosen", async () => {
        const autocomplete = vi
            .fn()
            .mockResolvedValue([{title: "Example Series", tvdbId: "7"}]);
        render(
            <SearchWorkspace
                catalog={catalog}
                initialValues={valuesFromSearch({category: "Series"}, catalog)}
                onSubmit={vi.fn()}
                autocomplete={autocomplete}
            />,
        );

        fireEvent.change(screen.getByTestId("search-query"), {
            target: {value: "Example"},
        });
        fireEvent.click(await screen.findByTestId("autocomplete-option"));

        const toggle = screen.getByTestId("search-advanced-toggle");
        expect(toggle).toHaveAttribute("aria-expanded", "true");
        expect(screen.getByTestId("search-advanced-panel")).toBeVisible();
        expect(screen.getByLabelText("Season")).toHaveFocus();
        // The auto-open is not the toggle, so it leaves no memory behind.
        expect(advancedOpenStore.has("nzbhydra.search.advancedOpen")).toBe(
            false,
        );
    });

    it("should open Advanced on the additional filter after a movie suggestion is chosen", async () => {
        const autocomplete = vi
            .fn()
            .mockResolvedValue([{title: "Example Movie", tmdbId: "42"}]);
        render(
            <SearchWorkspace
                catalog={catalog}
                initialValues={valuesFromSearch({category: "Cinema"}, catalog)}
                onSubmit={vi.fn()}
                autocomplete={autocomplete}
            />,
        );

        const input = screen.getByTestId("search-query");
        fireEvent.change(input, {target: {value: "Example"}});
        await screen.findByTestId("autocomplete-option");
        fireEvent.keyDown(input, {key: "ArrowDown"});
        fireEvent.keyDown(input, {key: "Enter"});

        expect(screen.getByTestId("search-advanced-toggle")).toHaveAttribute(
            "aria-expanded",
            "true",
        );
        expect(screen.getByTestId("additional-query")).toHaveFocus();
    });
});
