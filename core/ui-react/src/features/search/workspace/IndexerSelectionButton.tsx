import {
    Button,
    ButtonGroup,
    Divider,
    ListItemIcon,
    ListItemText,
    ListSubheader,
    Menu,
    MenuItem,
} from "@mui/material";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import DnsIcon from "@mui/icons-material/Dns";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import RemoveDoneIcon from "@mui/icons-material/RemoveDone";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import ShareIcon from "@mui/icons-material/Share";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import {useState} from "react";

import type {SearchIndexer} from "../../../domain/categories/catalog";

// A split button mirroring the legacy UI's actual search-page indexer
// selection control: a default "Invert selection" action plus a dropdown
// for the other bulk actions, with named-group actions broken into a
// labeled "Indexer groups" subsection.
//
// Legacy source: `core/ui-src/js/search-controller.js`'s
// `buildIndexerSelectionActions`/`buildGroupSelectionActions`, rendered by
// `core/ui-src/html/states/search.html`'s own split button. Action order
// matches legacy exactly: invert (always visible), then
// reset/select-all/deselect-all/usenet/torznab in the dropdown, then one
// action per indexer group under an "Indexer groups" subheader, exactly as
// legacy's `group: 'Indexer groups'` actions render. Icons substitute a
// semantically equivalent MUI icon per legacy glyphicon (ADR-0002).
export function IndexerSelectionButton({
    eligibleIndexers,
    selectedIndexers,
    onSelect,
    onReset,
}: {
    eligibleIndexers: SearchIndexer[];
    selectedIndexers: string[];
    onSelect(names: string[]): void;
    onReset(): void;
}) {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const open = Boolean(anchorEl);
    const close = () => setAnchorEl(null);
    const choose = (names: string[]) => {
        onSelect(names);
        close();
    };
    const usenetIndexers = eligibleIndexers
        .filter((indexer) => indexer.searchModuleType !== "TORZNAB")
        .map((indexer) => indexer.name);
    const torznabIndexers = eligibleIndexers
        .filter((indexer) => indexer.searchModuleType === "TORZNAB")
        .map((indexer) => indexer.name);
    const groups = [
        ...new Set(eligibleIndexers.flatMap((indexer) => indexer.groupNames)),
    ].sort();
    return (
        <>
            <ButtonGroup
                color="inherit"
                size="small"
                sx={{
                    "& .MuiButton-root": {
                        bgcolor: "surfaces.control",
                        borderColor: "surfaces.hairline",
                    },
                }}
                variant="outlined"
            >
                <Button
                    onClick={() =>
                        onSelect(
                            eligibleIndexers
                                .filter(
                                    (indexer) =>
                                        !selectedIndexers.includes(
                                            indexer.name,
                                        ),
                                )
                                .map((indexer) => indexer.name),
                        )
                    }
                    startIcon={<SwapHorizIcon />}
                >
                    Invert selection
                </Button>
                <Button
                    aria-expanded={open ? "true" : undefined}
                    aria-haspopup="menu"
                    aria-label="More selection options"
                    onClick={(event) => setAnchorEl(event.currentTarget)}
                    sx={{px: 0.5}}
                >
                    <ArrowDropDownIcon />
                </Button>
            </ButtonGroup>
            <Menu anchorEl={anchorEl} onClose={close} open={open}>
                <MenuItem
                    onClick={() => {
                        onReset();
                        close();
                    }}
                >
                    <ListItemIcon>
                        <RestartAltIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Reset to preselection</ListItemText>
                </MenuItem>
                <MenuItem
                    onClick={() =>
                        choose(eligibleIndexers.map((indexer) => indexer.name))
                    }
                >
                    <ListItemIcon>
                        <DoneAllIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Select all</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => choose([])}>
                    <ListItemIcon>
                        <RemoveDoneIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Deselect all</ListItemText>
                </MenuItem>
                {usenetIndexers.length > 0 && (
                    <MenuItem onClick={() => choose(usenetIndexers)}>
                        <ListItemIcon>
                            <DnsIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Select all usenet indexers</ListItemText>
                    </MenuItem>
                )}
                {torznabIndexers.length > 0 && (
                    <MenuItem onClick={() => choose(torznabIndexers)}>
                        <ListItemIcon>
                            <ShareIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Select all torznab indexers</ListItemText>
                    </MenuItem>
                )}
                {groups.length > 0 && [
                    <Divider key="indexer-groups-divider" />,
                    <ListSubheader
                        key="indexer-groups-header"
                        sx={{backgroundColor: "transparent"}}
                    >
                        Indexer groups
                    </ListSubheader>,
                    ...groups.map((group) => (
                        <MenuItem
                            key={group}
                            onClick={() =>
                                choose(
                                    eligibleIndexers
                                        .filter((indexer) =>
                                            indexer.groupNames.includes(group),
                                        )
                                        .map((indexer) => indexer.name),
                                )
                            }
                        >
                            <ListItemIcon>
                                <FolderOpenIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>Select group {group}</ListItemText>
                        </MenuItem>
                    )),
                ]}
            </Menu>
        </>
    );
}
