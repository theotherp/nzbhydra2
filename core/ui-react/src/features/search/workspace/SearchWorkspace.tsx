import {Alert, Box, Button, MenuItem, Stack, TextField} from "@mui/material";
import {Controller, useForm} from "react-hook-form";
import {z} from "zod";

import type {CategoryCatalog} from "../../../domain/categories/catalog";

const numericString = z.string().regex(/^\d*$/);
export const searchFormSchema = z.object({
    query: z.string(),
    category: z.string().min(1),
    minage: numericString,
    maxage: numericString,
    minsize: numericString,
    maxsize: numericString,
});

export type SearchFormValues = z.infer<typeof searchFormSchema>;

export function valuesFromSearch(
    search: Record<string, unknown>,
    catalog: CategoryCatalog,
): SearchFormValues {
    const category =
        typeof search.category === "string" &&
        catalog.categories.some((entry) => entry.name === search.category)
            ? search.category
            : catalog.defaultCategory.name;
    const field = (name: string) =>
        typeof search[name] === "string" && /^\d*$/.test(search[name])
            ? search[name]
            : "";
    const preset =
        catalog.enableCategorySizes && category === catalog.defaultCategory.name
            ? catalog.defaultCategory
            : catalog.categories.find((entry) => entry.name === category);
    return {
        query: typeof search.query === "string" ? search.query : "",
        category,
        minage: field("minage"),
        maxage: field("maxage"),
        minsize: field("minsize") || (preset?.minSizePreset?.toString() ?? ""),
        maxsize: field("maxsize") || (preset?.maxSizePreset?.toString() ?? ""),
    };
}

export function canonicalSearch(
    values: SearchFormValues,
): Record<string, string> {
    return Object.fromEntries(
        Object.entries(values).filter(([, value]) => value !== ""),
    );
}

export function SearchWorkspace({
    catalog,
    initialValues,
    onSubmit,
}: {
    catalog: CategoryCatalog;
    initialValues: SearchFormValues;
    onSubmit(values: SearchFormValues): void;
}) {
    const {
        register,
        handleSubmit,
        setValue,
        watch,
        control,
        formState: {errors},
    } = useForm<SearchFormValues>({defaultValues: initialValues});
    const selectedCategory = watch("category");
    const categoryChanged = (category: string) => {
        setValue("category", category);
        const selected = catalog.categories.find(
            (entry) => entry.name === category,
        );
        if (catalog.enableCategorySizes) {
            setValue("minsize", selected?.minSizePreset?.toString() ?? "");
            setValue("maxsize", selected?.maxSizePreset?.toString() ?? "");
        }
    };
    const noIndexers =
        catalog.preselectedIndexerNames(selectedCategory).length === 0;
    return (
        <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{mt: 3}}>
            <Stack spacing={2}>
                {noIndexers && (
                    <Alert severity="info">
                        No indexers are configured or enabled. Configure an
                        indexer before searching.
                    </Alert>
                )}
                <TextField
                    label="Search"
                    slotProps={{htmlInput: {"data-testid": "search-query"}}}
                    type="search"
                    {...register("query")}
                />
                <Controller
                    control={control}
                    name="category"
                    render={({field}) => (
                        <TextField
                            data-testid="search-category-control"
                            label="Category"
                            select
                            {...field}
                            onChange={(event) =>
                                categoryChanged(event.target.value)
                            }
                        >
                            {catalog.categories.map((category) => (
                                <MenuItem
                                    data-testid={`search-category-option-${category.name}`}
                                    key={category.name}
                                    value={category.name}
                                >
                                    {category.name}
                                </MenuItem>
                            ))}
                        </TextField>
                    )}
                />
                <Stack direction={{sm: "row"}} spacing={2}>
                    <TextField
                        label="Minimum age (days)"
                        type="number"
                        {...register("minage", {pattern: /^\d*$/})}
                        error={Boolean(errors.minage)}
                    />
                    <TextField
                        label="Maximum age (days)"
                        type="number"
                        {...register("maxage", {pattern: /^\d*$/})}
                        error={Boolean(errors.maxage)}
                    />
                    <TextField
                        label="Minimum size (MB)"
                        type="number"
                        {...register("minsize", {pattern: /^\d*$/})}
                        error={Boolean(errors.minsize)}
                    />
                    <TextField
                        label="Maximum size (MB)"
                        type="number"
                        {...register("maxsize", {pattern: /^\d*$/})}
                        error={Boolean(errors.maxsize)}
                    />
                </Stack>
                <Button
                    data-testid="search-submit"
                    disabled={noIndexers}
                    type="submit"
                    variant="contained"
                >
                    Search
                </Button>
            </Stack>
        </Box>
    );
}
