import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";

import {createCategoryCatalog} from "../../../domain/categories/catalog";
import type {SearchFormValues} from "./SearchWorkspace";
import {
    canonicalSearch,
    nonIdentifierQueryText,
    SearchWorkspace,
    valuesFromSearch,
} from "./SearchWorkspace";

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

describe("SearchWorkspace", () => {
    afterEach(cleanup);

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
        fireEvent.change(screen.getByLabelText("Minimum age (days)"), {
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
        for (const label of [
            "Minimum age (days)",
            "Maximum age (days)",
            "Minimum size (MB)",
            "Maximum size (MB)",
        ]) {
            expect(screen.getByLabelText(label)).toBeVisible();
        }

        fireEvent.change(screen.getByLabelText("Maximum size (MB)"), {
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
        expect(panel).not.toBeVisible();
    });

    it("should render the season and episode pair and the submit button inside the search-bar row", () => {
        render(
            <SearchWorkspace
                catalog={catalog}
                initialValues={valuesFromSearch({category: "Series"}, catalog)}
                onSubmit={vi.fn()}
                autocomplete={vi.fn()}
            />,
        );

        const row = screen.getByTestId("workspace-primary");
        const pair = screen.getByTestId("season-episode-pair");
        expect(row).toContainElement(pair);
        expect(row).toContainElement(screen.getByTestId("search-query"));
        expect(row).toContainElement(screen.getByTestId("search-submit"));
        expect(pair).toContainElement(screen.getByLabelText("Season"));
        expect(pair).toContainElement(screen.getByLabelText("Episode"));
        expect(pair).toHaveTextContent("S");
        expect(pair).toHaveTextContent("E");
        expect(
            screen.getByTestId("search-query").compareDocumentPosition(pair) &
                Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
    });

    it("should reconcile URL selections and support checkbox bulk selection actions", async () => {
        const indexerCatalog = createCategoryCatalog({
            categoriesConfig: {
                defaultCategory: "All",
                categories: [{name: "All"}, {name: "Movies"}, {name: "Series"}],
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
                const checkbox = expect(screen.getByRole("checkbox", {name}));
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

        const openIndexerMenu = () =>
            fireEvent.click(
                screen.getByRole("button", {name: "More selection options"}),
            );

        expectSelectedIndexerNames(["Movies only", "Usenet"]);
        openIndexerMenu();
        fireEvent.click(screen.getByRole("menuitem", {name: "Select all"}));
        expectSelectedIndexerNames(["Movies only", "Torrent", "Usenet"]);
        openIndexerMenu();
        fireEvent.click(screen.getByRole("menuitem", {name: "Deselect all"}));
        expectSelectedIndexerNames([]);
        fireEvent.click(screen.getByRole("button", {name: "Invert selection"}));
        expectSelectedIndexerNames(["Movies only", "Torrent", "Usenet"]);
        openIndexerMenu();
        fireEvent.click(
            screen.getByRole("menuitem", {name: "Reset to preselection"}),
        );
        expectSelectedIndexerNames(["Usenet"]);
        openIndexerMenu();
        fireEvent.click(
            screen.getByRole("menuitem", {name: "Select all usenet indexers"}),
        );
        expectSelectedIndexerNames(["Movies only", "Usenet"]);
        openIndexerMenu();
        fireEvent.click(
            screen.getByRole("menuitem", {name: "Select all torznab indexers"}),
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
        fireEvent.mouseDown(screen.getByRole("combobox", {name: "Category"}));
        fireEvent.click(screen.getByTestId("search-category-option-Series"));
        expect(
            screen.queryByRole("checkbox", {name: "Movies only"}),
        ).toBeNull();
        expect(screen.getByRole("checkbox", {name: "Torrent"})).toBeChecked();
        expect(screen.getByRole("checkbox", {name: "Usenet"})).toBeChecked();
        fireEvent.click(screen.getByTestId("search-submit"));
        await waitFor(() =>
            expect(submitted.mock.calls[0]?.[0]).toEqual(
                expect.objectContaining({indexers: ["Torrent", "Usenet"]}),
            ),
        );
    });

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
});
