import {Box} from "@mui/material";
import {useWatch} from "react-hook-form";

import type {ConfigValues} from "../../../api/config/schema";
import {
    ConfigFieldset,
    HelpBlock,
    SelectSetting,
    SwitchSetting,
    type SettingOption,
} from "../components";
import {CategoriesTable} from "./CategoriesTable";
import {CATEGORIES_HELP_LINES, type CategoryValues} from "./categoriesSettings";

/**
 * `F-CONFIG-CATEGORIES`: the Categories configuration tab -- the three
 * catalog-wide settings plus the category catalog of
 * `config-fields-service.js:1604-1836` (FM-107's `CategoriesTable`, which
 * replaced the shared repeat section), in legacy's order, bound to
 * `C-CONFIG-FORM`'s whole-config form through the `C-CONFIG-FIELDS`
 * vocabulary.
 *
 * The Default category select's options are recomputed from the form's own
 * live `categoriesConfig.categories` on every render (legacy's `controller`,
 * `config-fields-service.js:1618-1626`, only ran once at form-build time,
 * which is why its help text told the admin to reload the page after adding
 * a category). A category renamed or removed here therefore updates this
 * select immediately; it does not retroactively fix a `defaultCategory` value
 * that already pointed at the old name -- saving with a stale reference is
 * caught by `CategoriesConfigValidator` server-side, exactly as legacy leaves
 * it, and reported through the existing "Config validation failed" dialog.
 */
export function CategoriesConfigTab() {
    const categories =
        (useWatch<ConfigValues>({
            name: "categoriesConfig.categories",
        }) as CategoryValues[] | null | undefined) ?? [];
    const defaultCategoryOptions: SettingOption[] = [
        {label: "All", value: "All"},
        ...categories
            .filter(
                (category): category is CategoryValues & {name: string} =>
                    typeof category.name === "string" &&
                    category.name.length > 0,
            )
            .map((category) => ({
                label: category.name,
                value: category.name,
            })),
    ];

    return (
        <Box data-testid="config-categories">
            <SwitchSetting
                help="Preset min and max sizes depending on the selected category"
                label="Category sizes"
                name="categoriesConfig.enableCategorySizes"
                tooltip="Preset range of minimum and maximum sizes for its categories. When you select a category in the search area the appropriate fields are filled with these values."
            />
            <SelectSetting
                help="Set a default category."
                label="Default category"
                name="categoriesConfig.defaultCategory"
                options={defaultCategoryOptions}
            />
            <SwitchSetting
                help="Use search category for items with N/A category"
                label="Overwrite N/A with search category"
                name="categoriesConfig.overwriteNaWithSearchCategory"
                tooltip="Some indexers may return N/A as category for a result or the category mapping may have failed. With this option enabled the selected search category will be used."
            />
            <HelpBlock
                advanced
                lines={CATEGORIES_HELP_LINES}
                testId="config-categories-help"
            />
            <ConfigFieldset advanced label="Categories">
                <CategoriesTable />
            </ConfigFieldset>
        </Box>
    );
}
