import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import {
    Box,
    Button,
    Checkbox,
    FormControlLabel,
    FormGroup,
    IconButton,
    Menu,
    MenuItem,
    Popover,
    Stack,
    Switch,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from "@mui/material";
import {useId, useState} from "react";

import {
    STAT_FAMILIES,
    type StatFamily,
    type StatFamilySelection,
} from "../../../api/stats/mainStats";
import {DATE_PRESETS, toDateInputValue, type DatePresetId} from "./dateRange";

const DISCLAIMER =
    "Don't read too much into these stats. Which indexer is picked for a download depends on its score and some " +
    "more or less random values like posting time of the NZB. They are also heavily influenced by individual " +
    "settings, including indexer priority, search order, free vs. paid accounts, and the type of content being " +
    "searched for.";

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

export const FAMILY_LABELS: Record<StatFamily, string> = {
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
    const [infoAnchor, setInfoAnchor] = useState<HTMLElement | null>(null);
    const infoId = useId();
    const selectedCount = STAT_FAMILIES.filter(
        (family) => families[family],
    ).length;

    return (
        <Stack
            data-testid="stats-controls-header"
            direction="row"
            flexWrap="wrap"
            gap={2}
            sx={{alignItems: "center"}}
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
                <Stack direction="row" gap={1}>
                    <TextField
                        data-testid="stats-custom-after"
                        error={Boolean(customError)}
                        helperText={customError}
                        label="After"
                        onChange={(event) =>
                            onCustomChange("after", event.target.value)
                        }
                        slotProps={{inputLabel: {shrink: true}}}
                        type="date"
                        value={customAfter}
                    />
                    <TextField
                        data-testid="stats-custom-before"
                        error={Boolean(customError)}
                        label="Before"
                        onChange={(event) =>
                            onCustomChange("before", event.target.value)
                        }
                        slotProps={{inputLabel: {shrink: true}}}
                        type="date"
                        value={customBefore}
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
                    <Typography color="text.secondary" variant="caption">
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
            <IconButton
                aria-describedby={infoId}
                aria-label="About these statistics"
                data-testid="stats-disclaimer-button"
                onClick={(event) => setInfoAnchor(event.currentTarget)}
                size="small"
            >
                <InfoOutlinedIcon fontSize="small" />
            </IconButton>
            <Popover
                anchorEl={infoAnchor}
                anchorOrigin={{vertical: "bottom", horizontal: "left"}}
                id={infoId}
                onClose={() => setInfoAnchor(null)}
                open={Boolean(infoAnchor)}
            >
                <Typography sx={{p: 2, maxWidth: 420}} variant="body2">
                    {DISCLAIMER}
                </Typography>
            </Popover>
        </Stack>
    );
}

export function customDateInputsFor(after: Date, before: Date) {
    return {after: toDateInputValue(after), before: toDateInputValue(before)};
}
