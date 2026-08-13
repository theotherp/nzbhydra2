import {z} from "zod";

const categorySchema = z.object({
    name: z.string().min(1),
    searchType: z
        .enum(["BOOK", "MOVIE", "MUSIC", "SEARCH", "TVSEARCH"])
        .nullable()
        .optional()
        .transform((value) => value ?? "SEARCH"),
    mayBeSelected: z
        .boolean()
        .nullable()
        .optional()
        .transform((value) => value ?? true),
    ignoreResultsFrom: z.string().nullable().optional(),
    minSizePreset: z
        .number()
        .int()
        .nonnegative()
        .nullable()
        .optional()
        .transform((value) => value ?? undefined),
    maxSizePreset: z
        .number()
        .int()
        .nonnegative()
        .nullable()
        .optional()
        .transform((value) => value ?? undefined),
});

const safeConfigSchema = z.object({
    categoriesConfig: z.object({
        categories: z.array(categorySchema).min(1),
        defaultCategory: z.string().min(1),
        enableCategorySizes: z
            .boolean()
            .nullable()
            .optional()
            .transform((value) => value ?? false),
    }),
    indexers: z
        .array(
            z.object({
                name: z.string().min(1),
                preselect: z
                    .boolean()
                    .nullable()
                    .optional()
                    .transform((value) => value ?? false),
                showOnSearch: z
                    .boolean()
                    .nullable()
                    .optional()
                    .transform((value) => value ?? true),
                categories: z
                    .array(z.string())
                    .nullable()
                    .optional()
                    .transform((value) => value ?? undefined),
                groupNames: z
                    .array(z.string())
                    .nullable()
                    .optional()
                    .transform((value) =>
                        (value ?? []).filter((group) => group.length > 0),
                    ),
                searchModuleType: z
                    .string()
                    .nullable()
                    .optional()
                    .transform((value) => value ?? "NEWZNAB"),
            }),
        )
        .default([]),
});

export type Category = z.infer<typeof categorySchema>;

export type CategoryCatalog = {
    categories: Category[];
    defaultCategory: Category;
    enableCategorySizes: boolean;
    preselectedIndexerNames(category: string): string[];
    eligibleIndexers(category: string): SearchIndexer[];
};

export type SearchIndexer = {
    name: string;
    preselect: boolean;
    groupNames: string[];
    searchModuleType: string;
};

export function createCategoryCatalog(safeConfig: unknown): CategoryCatalog {
    const parsed = safeConfigSchema.safeParse(safeConfig);
    if (!parsed.success) {
        return emptyCatalog();
    }
    const {categories, defaultCategory, enableCategorySizes} =
        parsed.data.categoriesConfig;
    const selectable = categories.filter(
        (category) =>
            category.mayBeSelected &&
            category.ignoreResultsFrom !== "INTERNAL" &&
            category.ignoreResultsFrom !== "BOTH",
    );
    const fallback = selectable[0];
    const configuredDefault = selectable.find(
        (category) => category.name === defaultCategory,
    );
    if (!fallback || !configuredDefault) {
        return emptyCatalog();
    }
    return {
        categories: selectable,
        defaultCategory: configuredDefault,
        enableCategorySizes,
        eligibleIndexers(category) {
            return parsed.data.indexers
                .filter(
                    (indexer) =>
                        indexer.showOnSearch &&
                        (!indexer.categories ||
                            indexer.categories.length === 0 ||
                            category.toLowerCase() === "all" ||
                            indexer.categories.includes(category)),
                )
                .map(({name, preselect, groupNames, searchModuleType}) => ({
                    name,
                    preselect,
                    groupNames,
                    searchModuleType,
                }))
                .sort((left, right) => left.name.localeCompare(right.name));
        },
        preselectedIndexerNames(category) {
            return this.eligibleIndexers(category)
                .filter((indexer) => indexer.preselect)
                .map((indexer) => indexer.name);
        },
    };
}

function emptyCatalog(): CategoryCatalog {
    const all = {
        name: "All",
        searchType: "SEARCH" as const,
        mayBeSelected: true,
        minSizePreset: undefined,
        maxSizePreset: undefined,
    };
    return {
        categories: [all],
        defaultCategory: all,
        enableCategorySizes: false,
        preselectedIndexerNames: () => [],
        eligibleIndexers: () => [],
    };
}
