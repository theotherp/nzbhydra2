import {ThemeProvider} from "@mui/material";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {
    cleanup,
    fireEvent,
    render,
    screen,
    within,
} from "@testing-library/react";
import {useEffect} from "react";
import {FormProvider, useForm, type UseFormReturn} from "react-hook-form";
import {afterEach, describe, expect, it} from "vitest";

import type {ConfigValues} from "../../../api/config/schema";
import {createHydraTheme} from "../../../app/theme";
import {ShowAdvancedContext} from "../advancedFields";
import {CategoriesConfigTab} from "./CategoriesConfigTab";

const twoCategoryConfig: ConfigValues = {
    categoriesConfig: {
        defaultCategory: "All",
        enableCategorySizes: true,
        overwriteNaWithSearchCategory: false,
        categories: [
            {
                applyRestrictionsType: "BOTH",
                applySizeLimitsToApi: false,
                forbiddenRegex: null,
                forbiddenWords: [],
                ignoreResultsFrom: "NONE",
                mayBeSelected: true,
                maxSizePreset: 2000,
                minSizePreset: 1,
                name: "Movies",
                newznabCategories: ["2000"],
                preselect: true,
                requiredRegex: null,
                requiredWords: [],
                searchType: "MOVIE",
                subtype: "NONE",
            },
            {
                applyRestrictionsType: "NONE",
                applySizeLimitsToApi: false,
                forbiddenRegex: null,
                forbiddenWords: [],
                ignoreResultsFrom: "NONE",
                mayBeSelected: true,
                maxSizePreset: null,
                minSizePreset: null,
                name: "TV",
                newznabCategories: ["5000&5030"],
                preselect: true,
                requiredRegex: null,
                requiredWords: [],
                searchType: "TVSEARCH",
                subtype: "NONE",
            },
        ],
    },
};

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
                    <FormProvider {...form}>
                        <ShowAdvancedContext.Provider value={showAdvanced}>
                            <CategoriesConfigTab />
                        </ShowAdvancedContext.Provider>
                    </FormProvider>
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

afterEach(cleanup);

describe("F-CONFIG-CATEGORIES field inventory", () => {
    it("should render the catalog-wide fields and the Categories fieldset when advanced is on", () => {
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
        expect(
            screen.getByTestId(
                "config-repeat-entry-categoriesConfig-categories-0",
            ),
        ).toBeVisible();
        expect(
            screen.getByTestId(
                "config-repeat-entry-categoriesConfig-categories-1",
            ),
        ).toBeVisible();
    });

    it("should hide the help block and the Categories fieldset while advanced is off", () => {
        renderCategories({showAdvanced: false});

        expect(screen.queryByTestId("config-categories-help")).toBeNull();
        expect(screen.queryByTestId("config-fieldset-categories")).toBeNull();
        // The three catalog-wide fields are plain, not advanced.
        expect(
            screen.getByTestId(
                "config-setting-categoriesConfig-defaultCategory",
            ),
        ).toBeVisible();
    });

    it("should label each category entry by its name", () => {
        renderCategories();
        expect(
            screen.getByRole("heading", {level: 3, name: "Movies"}),
        ).toBeVisible();
        expect(
            screen.getByRole("heading", {level: 3, name: "TV"}),
        ).toBeVisible();
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

    it("should track a category renamed in this session without a reload", () => {
        renderCategories();

        fireEvent.change(
            screen.getByTestId(
                "config-input-categoriesConfig-categories-0-name",
            ),
            {target: {value: "Films"}},
        );

        fireEvent.mouseDown(
            screen.getByRole("combobox", {name: "Default category"}),
        );
        expect(screen.queryByRole("option", {name: "Movies"})).toBeNull();
        expect(screen.getByRole("option", {name: "Films"})).toBeVisible();
    });

    it("should stop offering a removed category", () => {
        renderCategories();

        fireEvent.click(
            screen.getByTestId(
                "config-repeat-remove-categoriesConfig-categories-0",
            ),
        );

        fireEvent.mouseDown(
            screen.getByRole("combobox", {name: "Default category"}),
        );
        expect(screen.queryByRole("option", {name: "Movies"})).toBeNull();
        expect(screen.getByRole("option", {name: "All"})).toBeVisible();
        expect(screen.getByRole("option", {name: "TV"})).toBeVisible();
    });
});

describe("F-CONFIG-CATEGORIES Categories section", () => {
    it("should add a new category with legacy's defaults and mark the form dirty", () => {
        const harness = renderCategories();
        expect(harness.form.formState.isDirty).toBe(false);

        fireEvent.click(
            screen.getByTestId("config-repeat-add-categoriesConfig-categories"),
        );

        const categories = categoriesConfigValues(harness).categories as Record<
            string,
            unknown
        >[];
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
        expect(
            screen.getByRole("heading", {level: 3, name: "New category"}),
        ).toBeVisible();
    });

    it("should remove a category and mark the form dirty", () => {
        const harness = renderCategories();
        expect(harness.form.formState.isDirty).toBe(false);

        fireEvent.click(
            screen.getByTestId(
                "config-repeat-remove-categoriesConfig-categories-1",
            ),
        );

        const categories = categoriesConfigValues(harness).categories as Record<
            string,
            unknown
        >[];
        expect(categories).toHaveLength(1);
        expect(categories[0]).toMatchObject({name: "Movies"});
        expect(harness.form.formState.isDirty).toBe(true);
        expect(
            screen.queryByTestId(
                "config-repeat-entry-categoriesConfig-categories-1",
            ),
        ).toBeNull();
    });

    it("should require a name and reject an empty one", async () => {
        const harness = renderCategories();

        fireEvent.change(
            screen.getByTestId(
                "config-input-categoriesConfig-categories-0-name",
            ),
            {target: {value: ""}},
        );

        expect(await harness.form.trigger()).toBe(false);
        expect(
            await screen.findByTestId(
                "config-error-categoriesConfig-categories-0-name",
            ),
        ).toBeVisible();
    });

    it("should add and remove newznab category chips, keeping an &-joined tuple as one string entry", () => {
        const harness = renderCategories();
        const entry = screen.getByTestId(
            "config-repeat-entry-categoriesConfig-categories-0",
        );
        const input = within(entry).getByTestId(
            "config-input-categoriesConfig-categories-0-newznabCategories",
        );

        expect(screen.getByText("2000")).toBeVisible();

        fireEvent.change(input, {target: {value: "2010&11000"}});
        fireEvent.keyDown(input, {key: "Enter"});

        const categories = categoriesConfigValues(harness).categories as Record<
            string,
            unknown
        >[];
        expect(categories[0]).toMatchObject({
            newznabCategories: ["2000", "2010&11000"],
        });
        expect(screen.getByText("2010&11000")).toBeVisible();
    });

    it("should edit the min/max size preset pair as one row", () => {
        const harness = renderCategories();

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

        const categories = categoriesConfigValues(harness).categories as Record<
            string,
            unknown
        >[];
        expect(categories[0]).toMatchObject({
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
    });

    it("should keep the categories array in the shared form across an unmount and remount of the tab", () => {
        const harness = renderCategories();

        fireEvent.click(
            screen.getByTestId("config-repeat-add-categoriesConfig-categories"),
        );
        fireEvent.change(
            screen.getByTestId(
                "config-input-categoriesConfig-categories-2-name",
            ),
            {target: {value: "Sports"}},
        );
        expect(
            (categoriesConfigValues(harness).categories as unknown[]).length,
        ).toBe(3);

        cleanup();
        function Remount() {
            return (
                <ThemeProvider theme={createHydraTheme("dark")}>
                    <FormProvider {...harness.form}>
                        <ShowAdvancedContext.Provider value={true}>
                            <CategoriesConfigTab />
                        </ShowAdvancedContext.Provider>
                    </FormProvider>
                </ThemeProvider>
            );
        }
        render(<Remount />);

        expect(
            screen.getByTestId(
                "config-input-categoriesConfig-categories-2-name",
            ),
        ).toHaveValue("Sports");
    });
});
