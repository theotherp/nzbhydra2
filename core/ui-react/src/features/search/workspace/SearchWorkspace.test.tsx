import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";

import {createCategoryCatalog} from "../../../domain/categories/catalog";
import {
    canonicalSearch,
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
        expect(
            canonicalSearch({
                query: "hello",
                category: "Cinema",
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
                indexers: ["Mock"],
            }),
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
        expect(canonicalSearch(restored)).toMatchObject({
            query: "extended edition",
            category: "Cinema",
            title: "Example Movie",
            imdbId: "tt1234567",
            tmdbId: "42",
        });
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

        expectSelectedIndexerNames(["Movies only", "Usenet"]);
        fireEvent.click(screen.getByRole("button", {name: "Select all"}));
        expectSelectedIndexerNames(["Movies only", "Torrent", "Usenet"]);
        fireEvent.click(screen.getByRole("button", {name: "Deselect all"}));
        expectSelectedIndexerNames([]);
        fireEvent.click(screen.getByRole("button", {name: "Invert selection"}));
        expectSelectedIndexerNames(["Movies only", "Torrent", "Usenet"]);
        fireEvent.click(
            screen.getByRole("button", {name: "Reset to preselection"}),
        );
        expectSelectedIndexerNames(["Usenet"]);
        fireEvent.click(
            screen.getByRole("button", {name: "Select all usenet indexers"}),
        );
        expectSelectedIndexerNames(["Movies only", "Usenet"]);
        fireEvent.click(
            screen.getByRole("button", {name: "Select all torznab indexers"}),
        );
        expectSelectedIndexerNames(["Torrent"]);
        fireEvent.click(
            screen.getByRole("button", {name: "Select group Primary"}),
        );
        expectSelectedIndexerNames(["Usenet"]);

        fireEvent.click(screen.getByRole("button", {name: "Select all"}));
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
