import {InputAdornment, Stack, TextField, Typography} from "@mui/material";
import {useController} from "react-hook-form";

import type {ConfigValues} from "../../../api/config/schema";
import {
    ChipsSetting,
    SelectSetting,
    SettingRow,
    settingInputTestId,
    SwitchSetting,
    TextSetting,
    textValue,
} from "../components";
import {
    APPLY_RESTRICTIONS_OPTIONS,
    CATEGORY_SEARCH_TYPE_OPTIONS,
    CATEGORY_SUBTYPE_OPTIONS,
    categoryFieldPath,
    IGNORE_RESULTS_FROM_OPTIONS,
    IGNORE_RESULTS_FROM_TOOLTIP,
    NEWZNAB_CATEGORIES_TOOLTIP,
    newznabCategoryValidator,
} from "./categoriesSettings";

/**
 * `F-CONFIG-CATEGORIES`'s per-category fields, in legacy's order
 * (`config-fields-service.js:1663-1832`), bound to one entry of
 * `categoriesConfig.categories`. Since FM-107 they are what an expanded row of
 * `CategoriesTable` renders, in place, rather than the body of a repeat-section
 * fieldset; they are unchanged apart from the newznab field's new per-chip
 * validator.
 */
export function CategoryEntryFields({index}: {index: number}) {
    return (
        <>
            <TextSetting
                help="Renaming categories might cause problems with repeating searches from the history."
                label="Name"
                name={categoryFieldPath(index, "name")}
                required
            />
            <SelectSetting
                help="Determines how indexers will be searched and if autocompletion is available in the GUI"
                label="Search type"
                name={categoryFieldPath(index, "searchType")}
                options={CATEGORY_SEARCH_TYPE_OPTIONS}
            />
            <SelectSetting
                help="Special search type. Used for indexer specific mappings between categories and newznab IDs"
                label="Sub type"
                name={categoryFieldPath(index, "subtype")}
                options={CATEGORY_SUBTYPE_OPTIONS}
            />
            <SelectSetting
                help="For which type of search word restrictions will be applied"
                label="Apply restrictions"
                name={categoryFieldPath(index, "applyRestrictionsType")}
                options={APPLY_RESTRICTIONS_OPTIONS}
            />
            <ChipsSetting
                help="Must *all* be present in a title which is converted to lowercase before. Apply words with return key."
                label="Required words"
                name={categoryFieldPath(index, "requiredWords")}
            />
            <TextSetting
                help="Must be present in a title (case is ignored)."
                label="Required regex"
                name={categoryFieldPath(index, "requiredRegex")}
            />
            <ChipsSetting
                help="None may be present in a title which is converted to lowercase before. Apply words with return key."
                label="Forbidden words"
                name={categoryFieldPath(index, "forbiddenWords")}
            />
            <TextSetting
                help="Must not be present in a title (case is ignored)."
                label="Forbidden regex"
                name={categoryFieldPath(index, "forbiddenRegex")}
            />
            <SizePresetRow index={index} />
            <SwitchSetting
                help="Enable to apply the size preset to API results from this category"
                label="Limit API results size"
                name={categoryFieldPath(index, "applySizeLimitsToApi")}
            />
            <ChipsSetting
                help="Map newznab categories to Hydra categories. Used for parsing and when searching internally. Apply categories with return key."
                label="Newznab categories"
                name={categoryFieldPath(index, "newznabCategories")}
                tooltip={NEWZNAB_CATEGORIES_TOOLTIP}
                validateChip={newznabCategoryValidator}
            />
            <SelectSetting
                help="Ignore results from this category"
                label="Ignore results"
                name={categoryFieldPath(index, "ignoreResultsFrom")}
                options={IGNORE_RESULTS_FROM_OPTIONS}
                tooltip={IGNORE_RESULTS_FROM_TOOLTIP}
            />
        </>
    );
}

/**
 * The min/max size preset pair as one row (legacy's `duoSetting`/`duolabel`
 * trio, `config-fields-service.js:1758-1777`): two MB-suffixed number inputs
 * either side of a dash, sharing a single `SettingRow` rather than each
 * getting its own. The row's `data-testid` is derived from the `minSizePreset`
 * path -- there is no single config path naming the pair as a whole.
 */
function SizePresetRow({index}: {index: number}) {
    const minName = categoryFieldPath(index, "minSizePreset");
    const maxName = categoryFieldPath(index, "maxSizePreset");
    const {field: minField} = useController<ConfigValues>({name: minName});
    const {field: maxField} = useController<ConfigValues>({name: maxName});
    return (
        <SettingRow
            help="Will set these values on the search page"
            label="Size preset"
            name={minName}
        >
            <Stack alignItems="center" direction="row" spacing={1}>
                <TextField
                    inputRef={minField.ref}
                    label="Min"
                    name={minField.name}
                    onBlur={minField.onBlur}
                    onChange={(event) =>
                        minField.onChange(sizeValue(event.target.value))
                    }
                    slotProps={{
                        htmlInput: {"data-testid": settingInputTestId(minName)},
                        input: {
                            endAdornment: (
                                <InputAdornment position="end">
                                    MB
                                </InputAdornment>
                            ),
                        },
                    }}
                    type="number"
                    value={textValue(minField.value)}
                />
                <Typography aria-hidden="true" component="span">
                    -
                </Typography>
                <TextField
                    inputRef={maxField.ref}
                    label="Max"
                    name={maxField.name}
                    onBlur={maxField.onBlur}
                    onChange={(event) =>
                        maxField.onChange(sizeValue(event.target.value))
                    }
                    slotProps={{
                        htmlInput: {"data-testid": settingInputTestId(maxName)},
                        input: {
                            endAdornment: (
                                <InputAdornment position="end">
                                    MB
                                </InputAdornment>
                            ),
                        },
                    }}
                    type="number"
                    value={textValue(maxField.value)}
                />
            </Stack>
        </SettingRow>
    );
}

function sizeValue(raw: string): number | null {
    if (raw.trim() === "") {
        return null;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
}
