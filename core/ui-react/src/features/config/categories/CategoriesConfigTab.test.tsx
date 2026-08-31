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
import {ToastProvider} from "../../../components/toasts/ToastProvider";
import {ShowAdvancedContext} from "../advancedFields";
import {settingsIndexForTab} from "../settingsSearch/settingsIndex";
import {CategoriesConfigTab} from "./CategoriesConfigTab";
import {defaultCategoryEntry, type CategoryValues} from "./categoriesSettings";

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
            <ThemeProvider theme={createHydraTheme("grey")}>
                <QueryClientProvider client={queryClient}>
                    <DialogProvider>
                        <ToastProvider>
                            <FormProvider {...form}>
                                <ShowAdvancedContext.Provider
                                    value={showAdvanced}
                                >
                                    <CategoriesConfigTab />
                                </ShowAdvancedContext.Provider>
                            </FormProvider>
                        </ToastProvider>
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

/** The dialog's own draft input for one `CategoryValues` field. */
function draftInput(field: string): HTMLElement {
    return screen.getByTestId(
        `config-input-categoriesConfig-categoryDraft-${field}`,
    );
}

async function openEdit(index: number): Promise<void> {
    fireEvent.click(screen.getByTestId(`config-category-edit-${index}`));
    await screen.findByTestId("config-category-dialog");
}

async function openAdd(): Promise<void> {
    fireEvent.click(screen.getByTestId("config-categories-add"));
    await screen.findByTestId("config-category-dialog");
}

function submitDialog(): void {
    fireEvent.click(screen.getByTestId("config-category-dialog-submit"));
}

async function waitForDialogClosed(): Promise<void> {
    await waitFor(() =>
        expect(screen.queryByTestId("config-category-dialog")).toBeNull(),
    );
}

/** Clicks the dialog's own Delete, then confirms the shared confirmation. */
async function deleteFromDialogAndConfirm(): Promise<void> {
    fireEvent.click(screen.getByTestId("config-category-dialog-delete"));
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
     * `repeatAnchor` helper, and that file is out of this packet's write
     * scope, so the table has to keep emitting the id the repeat section
     * emitted. The drift test cannot catch its loss -- it compares only
     * `kind: "row"` entries, and a list contributes a `kind: "section"` one --
     * so the check lives here, read off the index rather than typed out
     * again.
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

describe("F-CONFIG-CATEGORIES category dialog", () => {
    it("should open the dialog with the entry's own field values and commit only that row", async () => {
        const harness = renderCategories({
            values: configWith([
                MOVIES,
                TV,
                category({name: "Books", searchType: "BOOK"}),
            ]),
        });

        // The middle one, deliberately: a commit bound to "row 0" or "the
        // last opened dialog" would pass with an edge index.
        await openEdit(1);
        expect(draftInput("name")).toHaveValue("TV");

        fireEvent.change(draftInput("name"), {target: {value: "Series"}});
        submitDialog();
        await waitForDialogClosed();

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
     * The successor to the old accordion's always-mounted-fields guarantee
     * (`CategoriesTable.tsx`'s former module doc): `CategoryDialog.trigger()`
     * refuses to commit a blank name at all, rather than letting one through
     * for `C-CONFIG-FORM` to catch later from a control the admin has to find.
     */
    it("should refuse to commit a blank name, showing the error on the field and leaving the catalog untouched", async () => {
        const harness = renderCategories();

        await openEdit(0);
        fireEvent.change(draftInput("name"), {target: {value: ""}});
        submitDialog();

        expect(
            await screen.findByTestId(
                "config-error-categoriesConfig-categoryDraft-name",
            ),
        ).toHaveTextContent("This field is required");
        // Never closed, and nothing reached the shared form.
        expect(screen.getByTestId("config-category-dialog")).toBeVisible();
        expect(categoriesOf(harness)[0]).toMatchObject({name: "Movies"});
        expect(harness.form.formState.isDirty).toBe(false);
    });

    /** Same refusal, reached through Add rather than Edit. */
    it("should refuse to commit a brand new category with no name", async () => {
        const harness = renderCategories();

        await openAdd();
        expect(draftInput("name")).toHaveValue("");
        submitDialog();

        expect(
            await screen.findByTestId(
                "config-error-categoriesConfig-categoryDraft-name",
            ),
        ).toHaveTextContent("This field is required");
        expect(screen.getByTestId("config-category-dialog")).toBeVisible();
        // The placeholder Add pushed is still there -- the refusal keeps the
        // dialog open rather than dropping it -- but it still carries no
        // name, so it never actually committed anything of its own.
        expect(categoriesOf(harness)).toHaveLength(3);
        expect(categoriesOf(harness)[2]).toEqual(defaultCategoryEntry());
    });

    it("should edit the min/max size preset pair as one row in the dialog", async () => {
        const harness = renderCategories();
        await openEdit(0);

        fireEvent.change(draftInput("minSizePreset"), {
            target: {value: "5"},
        });
        fireEvent.change(draftInput("maxSizePreset"), {
            target: {value: "500"},
        });
        // One row: a single `config-setting-*-minSizePreset` wrapper carries
        // both inputs, not two separate rows. Checked before Submit, while
        // the dialog (and this wrapper) is still mounted.
        expect(
            screen.getAllByTestId(
                "config-setting-categoriesConfig-categoryDraft-minSizePreset",
            ),
        ).toHaveLength(1);

        submitDialog();
        await waitForDialogClosed();

        expect(categoriesOf(harness)[0]).toMatchObject({
            minSizePreset: 5,
            maxSizePreset: 500,
        });
        // And the summary column follows immediately.
        expect(screen.getByTestId("config-category-size-0")).toHaveTextContent(
            "5–500 MB",
        );
    });

    it("should keep the categories array in the shared form across an unmount and remount of the tab", async () => {
        const harness = renderCategories();

        await openAdd();
        fireEvent.change(draftInput("name"), {target: {value: "Sports"}});
        submitDialog();
        await waitForDialogClosed();
        expect(categoriesOf(harness)).toHaveLength(3);

        cleanup();
        function Remount() {
            return (
                <ThemeProvider theme={createHydraTheme("grey")}>
                    <DialogProvider>
                        <ToastProvider>
                            <FormProvider {...harness.form}>
                                <ShowAdvancedContext.Provider value={true}>
                                    <CategoriesConfigTab />
                                </ShowAdvancedContext.Provider>
                            </FormProvider>
                        </ToastProvider>
                    </DialogProvider>
                </ThemeProvider>
            );
        }
        render(<Remount />);

        expect(screen.getByTestId("config-category-name-2")).toHaveTextContent(
            "Sports",
        );
    });

    it("should delete the correct category from the dialog, leaving remaining rows correctly labelled", async () => {
        const harness = renderCategories();

        await openEdit(0);
        await deleteFromDialogAndConfirm();

        expect(categoriesOf(harness).map((entry) => entry.name)).toEqual([
            "TV",
        ]);
        expect(screen.queryByTestId("config-category-dialog")).toBeNull();
        // TV moved from index 1 to index 0.
        expect(screen.getByTestId("config-category-name-0")).toHaveTextContent(
            "TV",
        );
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

    it("should track a category renamed through the dialog without a reload", async () => {
        renderCategories();

        await openEdit(0);
        fireEvent.change(draftInput("name"), {target: {value: "Films"}});
        submitDialog();
        await waitForDialogClosed();

        fireEvent.mouseDown(
            screen.getByRole("combobox", {name: "Default category"}),
        );
        expect(screen.queryByRole("option", {name: "Movies"})).toBeNull();
        expect(screen.getByRole("option", {name: "Films"})).toBeVisible();
    });

    it("should stop offering a removed category", async () => {
        renderCategories();

        await openEdit(0);
        await deleteFromDialogAndConfirm();

        fireEvent.mouseDown(
            screen.getByRole("combobox", {name: "Default category"}),
        );
        expect(screen.queryByRole("option", {name: "Movies"})).toBeNull();
        expect(screen.getByRole("option", {name: "All"})).toBeVisible();
        expect(screen.getByRole("option", {name: "TV"})).toBeVisible();
    });
});

describe("F-CONFIG-CATEGORIES add and remove", () => {
    it("should add a new category with legacy's defaults, opened immediately, and mark the form dirty", async () => {
        const harness = renderCategories();
        expect(harness.form.formState.isDirty).toBe(false);

        await openAdd();
        expect(screen.getByTestId("config-category-dialog")).toHaveTextContent(
            "Add new category",
        );
        // Add pushes its placeholder straight into the shared form -- the
        // successor to the old expand-on-add (`CategoriesTable.tsx`'s former
        // `:155-162`) -- so `C-CONFIG-REVIEW`'s change summary has something
        // to report the moment Add is clicked, not only once a dialog is
        // confirmed.
        expect(categoriesOf(harness)).toHaveLength(3);
        expect(categoriesOf(harness)[2]).toEqual(defaultCategoryEntry());
        expect(harness.form.formState.isDirty).toBe(true);
        expect(screen.getByTestId("config-category-name-2")).toHaveTextContent(
            "New category",
        );

        fireEvent.change(draftInput("name"), {target: {value: "Sports"}});
        submitDialog();
        await waitForDialogClosed();

        const categories = categoriesOf(harness);
        expect(categories).toHaveLength(3);
        expect(categories[2]).toEqual({
            ...defaultCategoryEntry(),
            name: "Sports",
        });
        expect(harness.form.formState.isDirty).toBe(true);
        expect(screen.getByTestId("config-category-name-2")).toHaveTextContent(
            "Sports",
        );
    });

    /**
     * The guarantee the old always-mounted accordion carried, in its new
     * form: a category the admin never finished naming does not survive past
     * this transaction closing. Cancelling `add`'s placeholder removes it
     * from the shared form rather than leaving a nameless entry with no
     * mounted field anywhere to explain why a later save would be refused.
     */
    it("should undo a cancelled add, leaving the form exactly as it was", async () => {
        const harness = renderCategories();

        await openAdd();
        expect(categoriesOf(harness)).toHaveLength(3);
        fireEvent.change(draftInput("name"), {target: {value: "Typed"}});
        fireEvent.click(screen.getByTestId("config-category-dialog-cancel"));
        await waitForDialogClosed();

        expect(categoriesOf(harness)).toHaveLength(2);
        expect(categoriesOf(harness)).toEqual([MOVIES, TV]);
        expect(harness.form.formState.isDirty).toBe(false);
    });

    /**
     * The same guarantee against the failure mode Cancel/Escape/backdrop
     * cannot reach: `ConfigShell.tsx` mounts only one tab body at a time
     * while the shared form above `<Outlet />` persists, so switching tabs
     * without cancelling unmounts `CategoriesConfigTab` while an `add`
     * transaction is still open. The placeholder must not survive that any
     * more than it survives an explicit Cancel.
     */
    it("should undo an add abandoned by unmounting the tab, leaving no placeholder behind", async () => {
        const harness = renderCategories();

        await openAdd();
        expect(categoriesOf(harness)).toHaveLength(3);
        fireEvent.change(draftInput("name"), {target: {value: "Typed"}});

        cleanup();

        expect(categoriesOf(harness)).toHaveLength(2);
        expect(categoriesOf(harness)).toEqual([MOVIES, TV]);
        expect(harness.form.formState.isDirty).toBe(false);
    });

    it("should undo an added placeholder dismissed with Escape too", async () => {
        const harness = renderCategories();

        await openAdd();
        fireEvent.keyDown(screen.getByTestId("config-category-dialog"), {
            key: "Escape",
        });
        await waitForDialogClosed();

        expect(categoriesOf(harness)).toHaveLength(2);
        expect(harness.form.formState.isDirty).toBe(false);
    });

    it("should name the category in the delete confirmation and keep it when cancelled", async () => {
        const harness = renderCategories();

        await openEdit(0);
        fireEvent.click(screen.getByTestId("config-category-dialog-delete"));
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
        // Backing out of the confirmation returns to the still-open dialog
        // rather than discarding the whole edit.
        expect(screen.getByTestId("config-category-dialog")).toBeVisible();

        expect(categoriesOf(harness)).toHaveLength(2);
        expect(harness.form.formState.isDirty).toBe(false);
    });

    it("should remove a confirmed category and mark the form dirty", async () => {
        const harness = renderCategories();
        expect(harness.form.formState.isDirty).toBe(false);

        await openEdit(1);
        await deleteFromDialogAndConfirm();

        expect(categoriesOf(harness)).toHaveLength(1);
        expect(categoriesOf(harness)[0]).toMatchObject({name: "Movies"});
        expect(harness.form.formState.isDirty).toBe(true);
        expect(screen.queryByTestId("config-category-entry-1")).toBeNull();
    });

    it("should offer no Delete for a brand new category", async () => {
        renderCategories();
        await openAdd();
        expect(
            screen.queryByTestId("config-category-dialog-delete"),
        ).toBeNull();
    });
});

describe("F-CONFIG-CATEGORIES newznab category validation", () => {
    it("should keep an &-joined tuple as one string entry", async () => {
        const harness = renderCategories();
        await openEdit(0);
        const input = draftInput("newznabCategories");

        fireEvent.change(input, {target: {value: "2010&11000"}});
        fireEvent.keyDown(input, {key: "Enter"});
        submitDialog();
        await waitForDialogClosed();

        expect(categoriesOf(harness)[0]).toMatchObject({
            newznabCategories: ["2000", "2010&11000"],
        });
    });

    it("should refuse a malformed token in the dialog, naming it and the accepted shape, without adding it", async () => {
        const harness = renderCategories();
        await openEdit(0);
        const input = draftInput("newznabCategories");

        fireEvent.change(input, {target: {value: "2010,3000"}});
        fireEvent.keyDown(input, {key: "Enter"});

        const error = screen.getByTestId(
            "config-error-categoriesConfig-categoryDraft-newznabCategories",
        );
        expect(error).toHaveTextContent('"2010,3000"');
        expect(error).toHaveTextContent('several joined with "&"');

        submitDialog();
        await waitForDialogClosed();

        // Refused means not written: only the entry's original token
        // survived to the commit.
        expect(categoriesOf(harness)[0]).toMatchObject({
            newznabCategories: ["2000"],
        });
    });

    /**
     * The narrowing to digits is deliberate (`Integer.valueOf` would take
     * `-5`), and it must never become data loss: a stored token this UI would
     * refuse today still round-trips, flagged where the admin can see it --
     * on the summary row without opening anything, and again inside the
     * dialog as one of its chips.
     */
    it("should flag a stored token it would refuse rather than dropping it", async () => {
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
        // Untouched in the form, and not merely on screen: the next save
        // writes it back exactly as it was read.
        expect(categoriesOf(harness)[0]).toMatchObject({
            newznabCategories: ["-5", "2000"],
        });

        await openEdit(0);
        expect(
            screen.getByTestId(
                "config-input-categoriesConfig-categoryDraft-newznabCategories-chip--5",
            ),
        ).toBeInTheDocument();

        // Adding a valid token alongside it leaves the flagged one in place.
        const input = draftInput("newznabCategories");
        fireEvent.change(input, {target: {value: "3000"}});
        fireEvent.keyDown(input, {key: "Enter"});

        // And so does *refusing* one: the write that rejects the new token
        // must not take the stored violation down with it. This is the path
        // where the narrowing turns into data loss if the refusal filters the
        // whole value instead of only what was just added.
        fireEvent.change(input, {target: {value: "abc"}});
        fireEvent.keyDown(input, {key: "Enter"});
        expect(
            screen.getByTestId(
                "config-error-categoriesConfig-categoryDraft-newznabCategories",
            ),
        ).toHaveTextContent('"abc"');

        submitDialog();
        await waitForDialogClosed();

        expect(categoriesOf(harness)[0]).toMatchObject({
            newznabCategories: ["-5", "2000", "3000"],
        });
    });
});
