import {
    Box,
    Button,
    Checkbox,
    FormControlLabel,
    FormGroup,
    Menu,
    MenuItem,
    Stack,
    Switch,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from "@mui/material";
import {DatePicker} from "@mui/x-date-pickers/DatePicker";
import {useState} from "react";

import {
    STAT_FAMILIES,
    type StatFamily,
    type StatFamilySelection,
} from "../../../api/stats/mainStats";
import {
    DATE_DISPLAY_FORMAT,
    DATE_VALUE_FORMAT,
    pickerFieldSlotProps,
    pickerValueOf,
    pickerValueString,
} from "../../../domain/date-time/pickerValue";
import {DATE_PRESETS, type DatePresetId} from "./dateRange";

const FAMILY_GROUPS: {label: string; families: StatFamily[]}[] = [
    {
        label: "Indexers",
        families: [
            "avgResponseTimes",
            "avgIndexerUniquenessScore",
            "indexerApiAccessStats",
            "indexerDownloadShares",
            "successfulDownloadsPerIndexer",
        ],
    },
    {
        label: "Activity",
        families: [
            "searchesPerDayOfWeek",
            "searchesPerHourOfDay",
            "downloadsPerDayOfWeek",
            "downloadsPerHourOfDay",
        ],
    },
    {
        label: "Sources",
        families: [
            "searchSharesPerUser",
            "downloadSharesPerUser",
            "searchSharesPerIp",
            "downloadSharesPerIp",
            "userAgentSearchShares",
            "userAgentDownloadShares",
        ],
    },
    {
        label: "Download age",
        families: ["downloadsPerAgeStats"],
    },
];

const FAMILY_LABELS: Record<StatFamily, string> = {
    indexerApiAccessStats: "Indexer API accesses",
    avgIndexerUniquenessScore: "Indexer scores",
    avgResponseTimes: "Avg. response times",
    indexerDownloadShares: "Downloads per indexer",
    downloadsPerDayOfWeek: "Downloads per day of week",
    downloadsPerHourOfDay: "Downloads per hour of day",
    searchesPerDayOfWeek: "Searches per day of week",
    searchesPerHourOfDay: "Searches per hour of day",
    downloadsPerAgeStats: "Downloads per age",
    successfulDownloadsPerIndexer: "Successful downloads per indexer",
    downloadSharesPerUser: "Downloads per username",
    downloadSharesPerIp: "Downloads per host",
    searchSharesPerUser: "Searches per username",
    searchSharesPerIp: "Searches per host",
    userAgentSearchShares: "API searches per user agent",
    userAgentDownloadShares: "API downloads per user agent",
};

export function ControlsHeader({
    preset,
    onPresetChange,
    customAfter,
    customBefore,
    onCustomChange,
    customError,
    includeDisabled,
    onIncludeDisabledChange,
    families,
    onFamilyToggle,
    onRefresh,
}: {
    preset: DatePresetId;
    onPresetChange: (preset: DatePresetId) => void;
    customAfter: string;
    customBefore: string;
    onCustomChange: (field: "after" | "before", value: string) => void;
    customError: string | undefined;
    includeDisabled: boolean;
    onIncludeDisabledChange: (value: boolean) => void;
    families: StatFamilySelection;
    onFamilyToggle: (family: StatFamily) => void;
    onRefresh: () => void;
}) {
    const [familyMenuAnchor, setFamilyMenuAnchor] =
        useState<HTMLElement | null>(null);
    const selectedCount = STAT_FAMILIES.filter(
        (family) => families[family],
    ).length;

    return (
        <Stack
            data-testid="stats-controls-header"
            direction="row"
            sx={{
                flexWrap: "wrap",
                gap: 2,
                alignItems: "center",
            }}
        >
            <ToggleButtonGroup
                aria-label="Date range preset"
                exclusive
                onChange={(_event, value: DatePresetId | null) => {
                    if (value) onPresetChange(value);
                }}
                size="small"
                value={preset}
            >
                {DATE_PRESETS.map((entry) => (
                    <ToggleButton
                        data-testid={`stats-date-preset-${entry.id}`}
                        key={entry.id}
                        value={entry.id}
                    >
                        {entry.label}
                    </ToggleButton>
                ))}
            </ToggleButtonGroup>
            {preset === "custom" && (
                <Stack
                    direction="row"
                    sx={{
                        gap: 1,
                    }}
                >
                    <DatePicker
                        data-testid="stats-custom-after"
                        format={DATE_DISPLAY_FORMAT}
                        label="After"
                        onChange={(value) =>
                            onCustomChange(
                                "after",
                                pickerValueString(value, DATE_VALUE_FORMAT),
                            )
                        }
                        slotProps={{
                            ...pickerFieldSlotProps,
                            textField: {
                                error: Boolean(customError),
                                helperText: customError,
                            },
                        }}
                        value={pickerValueOf(customAfter, DATE_VALUE_FORMAT)}
                    />
                    <DatePicker
                        data-testid="stats-custom-before"
                        format={DATE_DISPLAY_FORMAT}
                        label="Before"
                        onChange={(value) =>
                            onCustomChange(
                                "before",
                                pickerValueString(value, DATE_VALUE_FORMAT),
                            )
                        }
                        slotProps={{
                            ...pickerFieldSlotProps,
                            textField: {
                                error: Boolean(customError),
                            },
                        }}
                        value={pickerValueOf(customBefore, DATE_VALUE_FORMAT)}
                    />
                </Stack>
            )}
            <FormControlLabel
                control={
                    <Switch
                        checked={includeDisabled}
                        data-testid="stats-include-disabled-toggle"
                        onChange={(event) =>
                            onIncludeDisabledChange(event.target.checked)
                        }
                    />
                }
                label="Show disabled indexers"
            />
            <Button
                aria-haspopup="true"
                data-testid="stats-family-menu-button"
                onClick={(event) => setFamilyMenuAnchor(event.currentTarget)}
                variant="outlined"
            >
                Statistics ({selectedCount}/{STAT_FAMILIES.length})
            </Button>
            <Menu
                anchorEl={familyMenuAnchor}
                onClose={() => setFamilyMenuAnchor(null)}
                open={Boolean(familyMenuAnchor)}
            >
                <Box sx={{px: 2, pt: 1, pb: 0.5, maxWidth: 320}}>
                    <Typography
                        variant="caption"
                        sx={{
                            color: "text.secondary",
                        }}
                    >
                        Deselecting a statistic skips its calculation, which
                        speeds up loading.
                    </Typography>
                </Box>
                {FAMILY_GROUPS.flatMap((group) => [
                    <MenuItem disabled dense key={`${group.label}-header`}>
                        <Typography variant="overline">
                            {group.label}
                        </Typography>
                    </MenuItem>,
                    ...group.families.map((family) => (
                        <MenuItem
                            dense
                            key={family}
                            onClick={() => onFamilyToggle(family)}
                        >
                            <FormGroup>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={families[family]}
                                            data-testid={`stats-family-${family}`}
                                            onChange={() =>
                                                onFamilyToggle(family)
                                            }
                                            onClick={(event) =>
                                                event.stopPropagation()
                                            }
                                        />
                                    }
                                    label={FAMILY_LABELS[family]}
                                    onClick={(event) => event.stopPropagation()}
                                />
                            </FormGroup>
                        </MenuItem>
                    )),
                ])}
            </Menu>
            <Button
                data-testid="stats-refresh-button"
                onClick={onRefresh}
                variant="contained"
            >
                Refresh
            </Button>
        </Stack>
    );
}
