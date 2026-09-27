import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import {Box, Button, Typography} from "@mui/material";

import type {SearchIndexer} from "../../../domain/categories/catalog";
import {indexerGroupMembers} from "./indexerGroups";

// `main.showIndexerGroupsSeparately`: the "Select group" actions of the
// indexer selection menu as a row of buttons beside the selection, so a group
// is one click away. A button reads as pressed while the selection is exactly
// that group.
export function IndexerGroupButtons({
    eligibleIndexers,
    groups,
    selectedIndexers,
    onSelect,
}: {
    eligibleIndexers: SearchIndexer[];
    groups: string[];
    selectedIndexers: string[];
    onSelect(names: string[]): void;
}) {
    return (
        <Box
            aria-label="Indexer groups"
            data-testid="workspace-indexer-groups"
            role="group"
            sx={{display: "flex", flexDirection: "column", gap: 0.75}}
        >
            <Typography component="h3" variant="refineSectionLabel">
                Groups
            </Typography>
            <Box sx={{display: "flex", flexWrap: "wrap", gap: 1}}>
                {groups.map((group) => {
                    const members = indexerGroupMembers(
                        eligibleIndexers,
                        group,
                    );
                    const active =
                        members.length === selectedIndexers.length &&
                        members.every((name) =>
                            selectedIndexers.includes(name),
                        );
                    return (
                        <Button
                            key={group}
                            aria-label={`Select group ${group}`}
                            aria-pressed={active}
                            color={active ? "primary" : "inherit"}
                            onClick={() => onSelect(members)}
                            size="small"
                            startIcon={<FolderOpenIcon />}
                            sx={{
                                maxWidth: "100%",
                                ...(!active && {
                                    bgcolor: "surfaces.control",
                                    borderColor: "surfaces.hairline",
                                }),
                            }}
                            title={group}
                            variant={active ? "contained" : "outlined"}
                        >
                            <Box
                                component="span"
                                sx={{
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {group}
                            </Box>
                        </Button>
                    );
                })}
            </Box>
        </Box>
    );
}
