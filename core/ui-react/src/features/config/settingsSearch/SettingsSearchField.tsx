import {
    Autocomplete,
    Box,
    Chip,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import {useState} from "react";

import {
    SETTINGS_INDEX,
    settingsSearchOptionTestId,
    type SettingsIndexEntry,
} from "./settingsIndex";
import {
    searchSettings,
    settingsSearchGroup,
    settingsSearchOptionDetail,
} from "./settingsSearchMatching";

/**
 * `C-CONFIG-SETTINGS-INDEX`'s field: one search box over every setting the
 * eight configuration tabs render, mounted in `F-CONFIG-SHELL`'s sticky save
 * bar so it is reachable at every scroll position of a very long tab.
 *
 * A stock MUI `Autocomplete` and nothing more (ADR-0014): its listbox, its
 * grouping, its keyboard navigation and its focus behaviour are the
 * component's own, so there is no custom key handling to keep working — with
 * the single exception documented on `onKeyDown` below, which exists to stop
 * the surrounding form from being submitted, not to navigate the list.
 */
export function SettingsSearchField({
    onSelect,
}: {
    onSelect: (entry: SettingsIndexEntry) => void;
}) {
    // The field is a launcher, not a value: after a hit is picked the query is
    // cleared so the next search starts empty, and the Autocomplete holds no
    // selected option to render back into the input.
    const [query, setQuery] = useState("");

    return (
        <Autocomplete<SettingsIndexEntry, false, false, false>
            autoHighlight
            blurOnSelect
            clearOnBlur
            filterOptions={(options, {inputValue}) =>
                searchSettings(inputValue, options)
            }
            getOptionLabel={(option) => option.label}
            groupBy={settingsSearchGroup}
            inputValue={query}
            isOptionEqualToValue={(option, value) => option.path === value.path}
            noOptionsText="No matching setting"
            onChange={(_event, entry) => {
                if (entry !== null) {
                    setQuery("");
                    onSelect(entry);
                }
            }}
            onInputChange={(_event, value) => setQuery(value)}
            onKeyDown={(event) => {
                // The save bar lives inside `ConfigShell`'s `<form>`, whose
                // Save button is a `type="submit"`. Without this, Enter in a
                // text field that is the form's only one triggers implicit
                // submission -- searching for a setting would save the entire
                // configuration. `Autocomplete` prevents the default itself
                // only while an option is highlighted; this covers the rest,
                // and because it does not set `defaultMuiPrevented` the
                // component's own Enter handling still runs and still selects.
                if (event.key === "Enter") {
                    event.preventDefault();
                }
            }}
            options={SETTINGS_INDEX}
            renderInput={(params) => (
                <TextField
                    {...params}
                    label="Search settings"
                    slotProps={{
                        ...params.slotProps,
                        htmlInput: {
                            ...params.slotProps.htmlInput,
                            "data-testid": "config-search",
                        },
                    }}
                />
            )}
            renderOption={({key, ...optionProps}, option) => (
                <Box
                    component="li"
                    key={key}
                    {...optionProps}
                    data-testid={settingsSearchOptionTestId(option)}
                >
                    <Stack
                        direction="row"
                        spacing={1}
                        sx={{
                            alignItems: "center",
                            minWidth: 0,
                            width: "100%",
                        }}
                    >
                        <Box sx={{flexGrow: 1, minWidth: 0}}>
                            <Typography component="div" variant="body2">
                                {option.label}
                            </Typography>
                            <Typography
                                component="div"
                                sx={{color: "text.secondary"}}
                                variant="caption"
                            >
                                {settingsSearchOptionDetail(option)}
                            </Typography>
                        </Box>
                        {option.advanced ? (
                            <Chip
                                label="Advanced"
                                size="small"
                                variant="outlined"
                            />
                        ) : null}
                    </Stack>
                </Box>
            )}
            size="small"
            /*
             * A width, not a design token: the bar is a flex row whose next
             * child already takes the remaining space, so the field needs an
             * intrinsic size of its own. 280 is a reading width for a setting
             * label -- the same reasoning as `SettingRow`'s 560 cap, at the
             * shorter strings an option shows -- and it collapses to the full
             * row below `sm`, where the bar wraps anyway.
             */
            sx={{minWidth: 0, width: {xs: "100%", sm: 280}}}
            value={null}
        />
    );
}
