import {ThemeProvider} from "@mui/material";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from "@testing-library/react";
import {useEffect} from "react";
import {FormProvider, useForm, type UseFormReturn} from "react-hook-form";
import {afterEach, describe, expect, it} from "vitest";

import type {ConfigValues} from "../../../api/config/schema";
import {createHydraTheme} from "../../../app/theme";
import {DialogProvider} from "../../../components/dialogs/DialogProvider";
import {ShowAdvancedContext} from "../advancedFields";
import {settingsIndexForTab} from "../settingsSearch/settingsIndex";
import {CategoriesConfigTab} from "./CategoriesConfigTab";
import type {CategoryValues} from "./categoriesSettings";

function category(overrides: Partial<CategoryValues>): CategoryValues {
    return {
        applyRestrictionsType: "NONE",
        applySizeLimitsToApi: false,
        forbiddenRegex: null,
        forbiddenWords: [],
        ignoreResultsFrom: "NONE",
        mayBeSelected: true,
        maxSizePreset: null,
        minSizePreset: null,
        name: "Category",
        newznabCategories: [],
        preselect: true,
        requiredRegex: null,
        requiredWords: [],
        searchType: "SEARCH",
        subtype: "NONE",
        ...overrides,
    };
}

function configWith(
    categories: CategoryValues[],
    overrides: Record<string, unknown> = {},
): ConfigValues {
    return {
        categoriesConfig: {
            defaultCategory: "All",
            enableCategorySizes: true,
            overwriteNaWithSearchCategory: false,
            categories,
            ...overrides,
        },
    };
}

const MOVIES = category({
    applyRestrictionsType: "BOTH",
    maxSizePreset: 2000,
    minSizePreset: 1,
    name: "Movies",
    newznabCategories: ["2000"],
    searchType: "MOVIE",
});

const TV = category({
    name: "TV",
    newznabCategories: ["5000&5030"],
    searchType: "TVSEARCH",
});

const twoCategoryConfig = configWith([MOVIES, TV]);

type Harness = {form: UseFormReturn<ConfigValues>};

function renderCategories({
    showAdvanced = true,
    values = twoCategoryConfig,
}: {showAdvanced?: boolean; values?: ConfigValues} = {}): Harness {
    const harness = {} as Harness;
    const queryClient = new QueryClient({
        defaultOptions: {queries: {retry: false}},
    });
    function Host() {
        const form = useForm<ConfigValues>({
            defaultValues: structuredClone(values),
            shouldUnregister: false,
        });
        useEffect(() => {
            harness.form = form;
        }, [form]);
        return (
            <ThemeProvider theme={createHydraTheme("dark")}>
                <QueryClientProvider client={queryClient}>
                    <DialogProvider>
                        <FormProvider {...form}>
                            <ShowAdvancedContext.Provider value={showAdvanced}>
                                <CategoriesConfigTab />
                            </ShowAdvancedContext.Provider>
                        </FormProvider>
                    </DialogProvider>
                </QueryClientProvider>
            </ThemeProvider>
        );
    }
    render(<Host />);
    return harness;
}

function categoriesConfigValues(harness: Harness): Record<string, unknown> {
    return harness.form.getValues().categoriesConfig as Record<string, unknown>;
}

function categoriesOf(harness: Harness): Record<string, unknown>[] {
    return categoriesConfigValues(harness).categories as Record<
        string,
        unknown
    >[];
}

function nameInput(index: number): HTMLElement {
    return screen.getByTestId(
        `config-input-categoriesConfig-categories-${index}-name`,
    );
}

function expandRow(index: number): void {
    fireEvent.click(screen.getByTestId(`config-category-expand-${index}`));
}

async function confirmDelete(index: number): Promise<void> {
    fireEvent.click(screen.getByTestId(`config-category-remove-${index}`));
    const confirmation = await screen.findByTestId(
        "config-category-delete-confirm",
    );
    fireEvent.click(within(confirmation).getByRole("button", {name: "Delete"}));
    await waitFor(() =>
        expect(
            screen.queryByTestId("config-category-delete-confirm"),
        ).toBeNull(),
    );
    // MUI's modal manager marks the rest of the document `aria-hidden` while a
    // dialog is open and restores it only once the exit transition has
    // finished, which is after the dialog's own test id has gone. Any role
    // query made in between finds nothing, so the wait is for the page to be
    // exposed again, not merely for the dialog to be gone.
    await waitFor(() =>
        expect(
            document.body.querySelector(
                '[aria-hidden="true"] [data-testid="config-categories"]',
            ),
        ).toBeNull(),
    );
}

afterEach(cleanup);

describe("F-CONFIG-CATEGORIES field inventory", () => {
    it("should render the catalog-wide fields and the Categories table when advanced is on", () => {
        renderCategories();

        expect(
            screen.getByTestId(
                "config-setting-categoriesConfig-enableCategorySizes",
            ),
        ).toBeVisible();
        expect(
            screen.getByTestId(
                "config-setting-categoriesConfig-defaultCategory",
            ),
        ).toBeVisible();
        expect(
            screen.getByTestId(
                "config-setting-categoriesConfig-overwriteNaWithSearchCategory",
            ),
        ).toBeVisible();
        expect(screen.getByTestId("config-categories-help")).toBeVisible();
        expect(screen.getByTestId("config-fieldset-categories")).toBeVisible();
        expect(screen.getByTestId("config-categories-table")).toBeVisible();
        expect(screen.getByTestId("config-category-entry-0")).toBeVisible();
        expect(screen.getByTestId("config-category-entry-1")).toBeVisible();
    });

    it("should hide the help block and the Categories fieldset while advanced is off", () => {
        renderCategories({showAdvanced: false});

        expect(screen.queryByTestId("config-categories-help")).toBeNull();
        expect(screen.queryByTestId("config-fieldset-categories")).toBeNull();
        expect(screen.queryByTestId("config-categories-table")).toBeNull();
        // The three catalog-wide fields are plain, not advanced.
        expect(
            screen.getByTestId(
                "config-setting-categoriesConfig-defaultCategory",
            ),
        ).toBeVisible();
    });

    /**
     * The one selector this section cannot lose. `settingsIndex.ts` derives
     * this section's search anchor from the config path through its own
     * `repeatAnchor` helper, and that file is out of FM-107's write scope, so
     * the table has to keep emitting the id the repeat section emitted. The
     * drift test cannot catch its loss -- it compares only `kind: "row"`
     * entries, and a list contributes a `kind: "section"` one -- so the check
     * lives here, read off the index rather than typed out again.
     */
    it("should keep the search anchor settingsIndex.ts derives for this section", () => {
        const anchors = settingsIndexForTab("categories")
            .filter((entry) => entry.kind === "section")
            .map((entry) => entry.anchorTestId);
        expect(anchors).toEqual(["config-repeat-categoriesConfig-categories"]);

        renderCategories();

        for (const anchor of anchors) {
            expect(screen.getByTestId(anchor)).toBeVisible();
        }
    });
});

describe("F-CONFIG-CATEGORIES catalog table", () => {
    it("should summarize one row per category, in configuration order", () => {
        renderCategories();

        expect(screen.getByTestId("config-category-name-0")).toHaveTextContent(
            "Movies",
        );
        expect(
            screen.getByTestId("config-category-searchType-0"),
        ).toHaveTextContent("Movie");
        expect(
            screen.getByTestId("config-category-newznabCategories-0"),
        ).toHaveTextContent("2000");
        expect(screen.getByTestId("config-category-size-0")).toHaveTextContent(
            "1–2000 MB",
        );

        expect(screen.getByTestId("config-category-name-1")).toHaveTextContent(
            "TV",
        );
        expect(
            screen.getByTestId("config-category-searchType-1"),
        ).toHaveTextContent("TV");
        expect(
            screen.getByTestId("config-category-newznabCategories-1"),
        ).toHaveTextContent("5000&5030");
        expect(screen.getByTestId("config-category-size-1")).toHaveTextContent(
            "None",
        );
    });

    it("should show the legend of a category with no name yet", () => {
        renderCategories({values: configWith([category({name: null})])});
        expect(screen.getByTestId("config-category-name-0")).toHaveTextContent(
            "New category",
        );
    });

    it("should show the empty catalog as such", () => {
        renderCategories({values: configWith([])});
        expect(screen.getByTestId("config-categories-empty")).toBeVisible();
    });

    /**
     * `enableCategorySizes` gates the size column live, not at mount: the
     * switch sits on the same tab, directly above the table.
     */
    it("should add and remove the size column as the catalog-wide switch is flipped", () => {
        renderCategories({
            values: configWith([MOVIES], {enableCategorySizes: false}),
        });

        expect(screen.queryByTestId("config-category-size-0")).toBeNull();
        expect(screen.queryByRole("columnheader", {name: "Size"})).toBeNull();

        fireEvent.click(
            screen.getByTestId(
                "config-input-categoriesConfig-enableCategorySizes",
            ),
        );

        expect(screen.getByTestId("config-category-size-0")).toHaveTextContent(
            "1–2000 MB",
        );
        expect(screen.getByRole("columnheader", {name: "Size"})).toBeVisible();
    });
});

describe("F-CONFIG-CATEGORIES row expansion", () => {
    it("should bind an expanded row's fields to that row's own entry", () => {
        const harness = renderCategories({
            values: configWith([
                MOVIES,
                TV,
                category({name: "Books", searchType: "BOOK"}),
            ]),
        });

        // The middle one, deliberately: an expansion bound to "the first row"
        // or to "the only open row" would pass with an edge one.
        expandRow(1);
        expect(screen.getByTestId("config-category-expand-1")).toHaveAttribute(
            "aria-expanded",
            "true",
        );

        fireEvent.change(nameInput(1), {target: {value: "Series"}});

        expect(categoriesOf(harness).map((entry) => entry.name)).toEqual([
            "Movies",
            "Series",
            "Books",
        ]);
        expect(screen.getByTestId("config-category-name-1")).toHaveTextContent(
            "Series",
        );
    });

    /**
     * The reason `Collapse` here carries no `unmountOnExit`. `name` is
     * `required`, so a blank one blocks the save; if collapsing unmounted the
     * row, the save would be refused with nothing on screen saying why.
     */
    it("should keep a collapsed row's required name registered and its error rendered", async () => {
        const harness = renderCategories({
            values: configWith([MOVIES, category({name: ""})]),
        });

        // Nothing was expanded, so this input is in the DOM only because a
        // collapsed row keeps its fields mounted.
        expect(nameInput(1)).toBeInTheDocument();
        expect(await harness.form.trigger()).toBe(false);
        expect(
            await screen.findByTestId(
                "config-error-categoriesConfig-categories-1-name",
            ),
        ).toBeInTheDocument();
    });

    it("should edit an expanded row's min/max size preset pair as one row", () => {
        const harness = renderCategories();
        expandRow(0);

        fireEvent.change(
            screen.getByTestId(
                "config-input-categoriesConfig-categories-0-minSizePreset",
            ),
            {target: {value: "5"}},
        );
        fireEvent.change(
            screen.getByTestId(
                "config-input-categoriesConfig-categories-0-maxSizePreset",
            ),
            {target: {value: "500"}},
        );

        expect(categoriesOf(harness)[0]).toMatchObject({
            minSizePreset: 5,
            maxSizePreset: 500,
        });
        // One row: a single `config-setting-*-minSizePreset` wrapper carries
        // both inputs, not two separate rows.
        expect(
            screen.getAllByTestId(
                "config-setting-categoriesConfig-categories-0-minSizePreset",
            ),
        ).toHaveLength(1);
        // And the summary column follows immediately.
        expect(screen.getByTestId("config-category-size-0")).toHaveTextContent(
            "5–500 MB",
        );
    });

    it("should keep the categories array in the shared form across an unmount and remount of the tab", () => {
        const harness = renderCategories();

        fireEvent.click(screen.getByTestId("config-categories-add"));
        fireEvent.change(nameInput(2), {target: {value: "Sports"}});
        expect(categoriesOf(harness)).toHaveLength(3);

        cleanup();
        function Remount() {
            return (
                <ThemeProvider theme={createHydraTheme("dark")}>
                    <DialogProvider>
                        <FormProvider {...harness.form}>
                            <ShowAdvancedContext.Provider value={true}>
                                <CategoriesConfigTab />
                            </ShowAdvancedContext.Provider>
                        </FormProvider>
                    </DialogProvider>
                </ThemeProvider>
            );
        }
        render(<Remount />);

        expect(nameInput(2)).toHaveValue("Sports");
    });

    it("should follow the category, not the row slot, when an earlier one is deleted", async () => {
        const harness = renderCategories();

        expandRow(1);
        await confirmDelete(0);

        expect(categoriesOf(harness).map((entry) => entry.name)).toEqual([
            "TV",
        ]);
        // TV moved from index 1 to index 0 and is still the open row.
        expect(screen.getByTestId("config-category-expand-0")).toHaveAttribute(
            "aria-expanded",
            "true",
        );
        expect(nameInput(0)).toHaveValue("TV");
    });
});

describe("F-CONFIG-CATEGORIES default category select", () => {
    it("should offer All plus every configured category name", () => {
        renderCategories();
        fireEvent.mouseDown(
            screen.getByRole("combobox", {name: "Default category"}),
        );
        expect(screen.getByRole("option", {name: "All"})).toBeVisible();
        expect(screen.getByRole("option", {name: "Movies"})).toBeVisible();
        expect(screen.getByRole("option", {name: "TV"})).toBeVisible();
    });

    it("should track a category renamed in an expanded row without a reload", () => {
        renderCategories();

        expandRow(0);
        fireEvent.change(nameInput(0), {target: {value: "Films"}});

        fireEvent.mouseDown(
            screen.getByRole("combobox", {name: "Default category"}),
        );
        expect(screen.queryByRole("option", {name: "Movies"})).toBeNull();
        expect(screen.getByRole("option", {name: "Films"})).toBeVisible();
    });

    it("should stop offering a removed category", async () => {
        renderCategories();

        await confirmDelete(0);

        fireEvent.mouseDown(
            screen.getByRole("combobox", {name: "Default category"}),
        );
        expect(screen.queryByRole("option", {name: "Movies"})).toBeNull();
        expect(screen.getByRole("option", {name: "All"})).toBeVisible();
        expect(screen.getByRole("option", {name: "TV"})).toBeVisible();
    });
});

describe("F-CONFIG-CATEGORIES add and remove", () => {
    it("should add a new category with legacy's defaults, expanded, and mark the form dirty", () => {
        const harness = renderCategories();
        expect(harness.form.formState.isDirty).toBe(false);

        fireEvent.click(screen.getByTestId("config-categories-add"));

        const categories = categoriesOf(harness);
        expect(categories).toHaveLength(3);
        expect(categories[2]).toEqual({
            applyRestrictionsType: "NONE",
            applySizeLimitsToApi: false,
            forbiddenRegex: null,
            forbiddenWords: [],
            ignoreResultsFrom: "NONE",
            mayBeSelected: true,
            maxSizePreset: null,
            minSizePreset: null,
            name: null,
            newznabCategories: [],
            preselect: true,
            requiredRegex: null,
            requiredWords: [],
            searchType: "SEARCH",
            subtype: "NONE",
        });
        expect(harness.form.formState.isDirty).toBe(true);
        expect(screen.getByTestId("config-category-name-2")).toHaveTextContent(
            "New category",
        );
        // Opened for editing: its `name` is blank and required.
        expect(screen.getByTestId("config-category-expand-2")).toHaveAttribute(
            "aria-expanded",
            "true",
        );
    });

    it("should name the category in the delete confirmation and keep it when cancelled", async () => {
        const harness = renderCategories();

        fireEvent.click(screen.getByTestId("config-category-remove-0"));
        const confirmation = await screen.findByTestId(
            "config-category-delete-confirm",
        );
        expect(confirmation).toHaveTextContent('Delete the category "Movies"?');

        fireEvent.click(
            within(confirmation).getByRole("button", {name: "Cancel"}),
        );
        await waitFor(() =>
            expect(
                screen.queryByTestId("config-category-delete-confirm"),
            ).toBeNull(),
        );

        expect(categoriesOf(harness)).toHaveLength(2);
        expect(harness.form.formState.isDirty).toBe(false);
    });

    it("should remove a confirmed category and mark the form dirty", async () => {
        const harness = renderCategories();
        expect(harness.form.formState.isDirty).toBe(false);

        await confirmDelete(1);

        expect(categoriesOf(harness)).toHaveLength(1);
        expect(categoriesOf(harness)[0]).toMatchObject({name: "Movies"});
        expect(harness.form.formState.isDirty).toBe(true);
        expect(screen.queryByTestId("config-category-entry-1")).toBeNull();
    });
});

describe("F-CONFIG-CATEGORIES newznab category validation", () => {
    it("should keep an &-joined tuple as one string entry", () => {
        const harness = renderCategories();
        expandRow(0);
        const input = screen.getByTestId(
            "config-input-categoriesConfig-categories-0-newznabCategories",
        );

        fireEvent.change(input, {target: {value: "2010&11000"}});
        fireEvent.keyDown(input, {key: "Enter"});

        expect(categoriesOf(harness)[0]).toMatchObject({
            newznabCategories: ["2000", "2010&11000"],
        });
    });

    it("should refuse a malformed token, naming it and the accepted shape", () => {
        const harness = renderCategories();
        expandRow(0);
        const input = screen.getByTestId(
            "config-input-categoriesConfig-categories-0-newznabCategories",
        );

        fireEvent.change(input, {target: {value: "2010,3000"}});
        fireEvent.keyDown(input, {key: "Enter"});

        const error = screen.getByTestId(
            "config-error-categoriesConfig-categories-0-newznabCategories",
        );
        expect(error).toHaveTextContent('"2010,3000"');
        expect(error).toHaveTextContent('several joined with "&"');
        // Refused means not written: the stored value is untouched and the
        // form is not dirty.
        expect(categoriesOf(harness)[0]).toMatchObject({
            newznabCategories: ["2000"],
        });
        expect(harness.form.formState.isDirty).toBe(false);
    });

    /**
     * The narrowing to digits is deliberate (`Integer.valueOf` would take
     * `-5`), and it must never become data loss: a stored token this UI would
     * refuse today still round-trips, flagged where the admin can see it.
     */
    it("should flag a stored token it would refuse rather than dropping it", () => {
        const harness = renderCategories({
            values: configWith([
                category({name: "Odd", newznabCategories: ["-5", "2000"]}),
            ]),
        });

        const summary = screen.getByTestId(
            "config-category-newznabCategories-0",
        );
        expect(summary).toHaveTextContent("-5");
        expect(
            within(summary).getByLabelText(/^-5 — "-5" is not a newznab/),
        ).toBeInTheDocument();
        // Untouched in the form, and not merely on screen: the next save writes
        // it back exactly as it was read.
        expect(categoriesOf(harness)[0]).toMatchObject({
            newznabCategories: ["-5", "2000"],
        });

        expandRow(0);
        const chips = screen.getByTestId(
            "config-input-categoriesConfig-categories-0-newznabCategories-chip--5",
        );
        expect(chips).toBeInTheDocument();

        // Adding a valid token alongside it leaves the flagged one in place.
        const input = screen.getByTestId(
            "config-input-categoriesConfig-categories-0-newznabCategories",
        );
        fireEvent.change(input, {target: {value: "3000"}});
        fireEvent.keyDown(input, {key: "Enter"});
        expect(categoriesOf(harness)[0]).toMatchObject({
            newznabCategories: ["-5", "2000", "3000"],
        });

        // And so does *refusing* one: the write that rejects the new token must
        // not take the stored violation down with it. This is the path where a
        // narrowing turns into data loss if the refusal filters the whole
        // value instead of only what was just added.
        fireEvent.change(input, {target: {value: "abc"}});
        fireEvent.keyDown(input, {key: "Enter"});
        expect(
            screen.getByTestId(
                "config-error-categoriesConfig-categories-0-newznabCategories",
            ),
        ).toHaveTextContent('"abc"');
        expect(categoriesOf(harness)[0]).toMatchObject({
            newznabCategories: ["-5", "2000", "3000"],
        });
    });
});
