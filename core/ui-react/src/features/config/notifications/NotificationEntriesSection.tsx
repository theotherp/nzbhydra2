import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Button,
    Chip,
    Menu,
    MenuItem,
    Stack,
    Typography,
} from "@mui/material";
import {useState} from "react";
import {useFormContext, useWatch} from "react-hook-form";

import type {ConfigValues} from "../../../api/config/schema";
import {ApiTransport} from "../../../api/transport";
import {settingTestId} from "../components";
import {NotificationEntryFields} from "./NotificationEntryFields";
import {
    newNotificationEntry,
    NOTIFICATION_EVENTS,
    type NotificationEntryValues,
} from "./notificationEvents";
import {
    messageTypeLabel,
    NOTIFICATION_ENTRIES_PATH,
    notificationEntryLegend,
} from "./notificationsSettings";

const ADD_MENU_ID = "config-notifications-add-menu";

const ADD_LABEL = "Add new notification";

const EMPTY_STATE_HEADING = "No notifications configured";

/**
 * `F-CONFIG-NOTIFICATIONS`' entries list: one stock MUI `Accordion` per
 * configured entry, summary showing the event legend and the entry's message
 * type, details holding the fields that were previously all stacked open.
 *
 * It is not `C-CONFIG-FIELDS`' `RepeatSection` any more (FM-106), for the same
 * reason `DownloadersSection`, `ExternalToolsSection`, `CustomMappingsSection`
 * and `AuthUsersSection` are not: the summary is this feature's own -- it needs
 * the event vocabulary to humanize the legend and the message-type option list
 * to humanize the badge -- and `RepeatSection`'s registry entry describes a
 * plain in-place list, which the other consumer (Categories) still wants
 * unchanged. Adding an accordion mode there instead would have put four
 * untouched tabs in the blast radius to serve one caller.
 *
 * Every `data-testid` `RepeatSection` emitted is preserved so the add, remove,
 * and per-entry selectors keep meaning what they meant; the expand control is
 * the one addition (`config-repeat-toggle-<path>-<index>`).
 *
 * The array lives in `C-CONFIG-FORM`'s single form and every mutation goes
 * through its `setValue` with `shouldDirty`, so switching config tabs -- which
 * unmounts this component -- never loses an entry that was added but not saved.
 * Which entries are *expanded* is deliberately the opposite: it is view state,
 * not configuration, and is not persisted.
 */
export function NotificationEntriesSection({
    transport,
}: {
    transport: ApiTransport;
}) {
    const {getValues, setValue} = useFormContext<ConfigValues>();
    const entries =
        (useWatch<ConfigValues>({name: NOTIFICATION_ENTRIES_PATH}) as
            | NotificationEntryValues[]
            | null
            | undefined) ?? [];
    const testId = settingTestId(NOTIFICATION_ENTRIES_PATH);
    const [addMenuAnchor, setAddMenuAnchor] = useState<HTMLElement | null>(
        null,
    );
    /**
     * Expanded rows, by index. Several may be open at once: comparing two
     * entries' templates is the reason an admin opens this tab at all, and
     * an accordion that closes the entry being copied from would make that
     * harder than the flat list was.
     */
    const [expanded, setExpanded] = useState<ReadonlySet<number>>(new Set());

    /** The array as the form holds it *now*, never a value a render captured. */
    const currentEntries = (): NotificationEntryValues[] =>
        (getValues(NOTIFICATION_ENTRIES_PATH) as
            | NotificationEntryValues[]
            | null
            | undefined) ?? [];

    const write = (next: NotificationEntryValues[]) =>
        setValue(NOTIFICATION_ENTRIES_PATH, next as never, {
            shouldDirty: true,
        });

    const addEntry = (eventType: string) => {
        const next = [...currentEntries(), newNotificationEntry(eventType)];
        write(next);
        // A just-added entry is opened: its whole point is that it now needs
        // URLs filled in, and leaving it collapsed would hide the fields the
        // admin came to edit behind a second click.
        setExpanded(new Set([...expanded, next.length - 1]));
    };

    const removeEntry = (index: number) => {
        write(
            currentEntries().filter(
                (_entry, entryIndex) => entryIndex !== index,
            ),
        );
        setExpanded(shiftExpandedAfterRemoval(expanded, index));
    };

    const toggle = (index: number, open: boolean) => {
        const next = new Set(expanded);
        if (open) {
            next.add(index);
        } else {
            next.delete(index);
        }
        setExpanded(next);
    };

    return (
        <Box data-testid={`config-repeat-${testId}`}>
            {entries.length === 0 ? (
                <Box data-testid="config-notifications-empty" sx={{mb: 2}}>
                    <Typography component="h3" gutterBottom variant="subtitle1">
                        {EMPTY_STATE_HEADING}
                    </Typography>
                    <Typography variant="body2">
                        Use the &quot;{ADD_LABEL}&quot; button below to send a
                        notification when one of NZBHydra&apos;s events occurs.
                    </Typography>
                </Box>
            ) : (
                <Box sx={{mb: 2}}>
                    {entries.map((entry, index) => (
                        <Accordion
                            data-testid={`config-repeat-entry-${testId}-${index}`}
                            expanded={expanded.has(index)}
                            // The index is the deliberate React key: row N
                            // always shows and edits whatever is currently at
                            // index N, which is what is saved to index N.
                            key={index}
                            onChange={(_event, open) => toggle(index, open)}
                        >
                            <AccordionSummary
                                data-testid={`config-repeat-toggle-${testId}-${index}`}
                                expandIcon={<ExpandMoreIcon />}
                            >
                                <Stack
                                    direction={{sm: "row", xs: "column"}}
                                    spacing={1}
                                    useFlexGap
                                    sx={{
                                        // `flex-start` at `xs` on purpose: the
                                        // column stack would otherwise stretch
                                        // the message-type chip to the full
                                        // row width, where it reads as a
                                        // button rather than as a badge on the
                                        // heading.
                                        alignItems: {
                                            sm: "center",
                                            xs: "flex-start",
                                        },
                                        width: "100%",
                                    }}
                                >
                                    {/*
                                     * `span`, not a heading: `AccordionSummary`
                                     * is a `ButtonBase`, so a heading nested
                                     * here is both an invalid content model
                                     * and -- because a button's children are
                                     * presentational per ARIA -- not exposed
                                     * as a heading by a real browser at all,
                                     * however green a jsdom `getByRole`
                                     * assertion looks. The heading the entry
                                     * list needs is the one stock MUI already
                                     * puts *around* the summary: `Accordion`
                                     * renders its `heading` slot as an `<h3>`
                                     * wrapping the button
                                     * (`Accordion.js:129,228`), which is the
                                     * conventional accordion shape. Its name
                                     * is this row's whole summary -- legend
                                     * plus message type -- so leave the
                                     * explicit `component` off `subtitle1`
                                     * too, whose default mapping is `h6`.
                                     */}
                                    <Typography
                                        component="span"
                                        variant="subtitle1"
                                    >
                                        {notificationEntryLegend(entry)}
                                    </Typography>
                                    <Chip
                                        label={messageTypeLabel(
                                            entry.messageType,
                                        )}
                                        size="small"
                                        variant="outlined"
                                    />
                                </Stack>
                            </AccordionSummary>
                            <AccordionDetails>
                                <NotificationEntryFields
                                    index={index}
                                    transport={transport}
                                />
                                <Button
                                    color="error"
                                    data-testid={`config-repeat-remove-${testId}-${index}`}
                                    onClick={() => removeEntry(index)}
                                    startIcon={<DeleteIcon />}
                                    type="button"
                                >
                                    Remove {notificationEntryLegend(entry)}
                                </Button>
                            </AccordionDetails>
                        </Accordion>
                    ))}
                </Box>
            )}
            <Button
                aria-controls={addMenuAnchor === null ? undefined : ADD_MENU_ID}
                aria-expanded={addMenuAnchor !== null}
                aria-haspopup="menu"
                data-testid={`config-repeat-add-${testId}`}
                onClick={(event) => setAddMenuAnchor(event.currentTarget)}
                startIcon={<AddIcon />}
                type="button"
                variant="outlined"
            >
                {ADD_LABEL}
            </Button>
            <Menu
                anchorEl={addMenuAnchor}
                id={ADD_MENU_ID}
                onClose={() => setAddMenuAnchor(null)}
                open={addMenuAnchor !== null}
            >
                {NOTIFICATION_EVENTS.map((event) => (
                    <MenuItem
                        data-testid={`config-repeat-add-option-${testId}-${event.eventType}`}
                        key={event.eventType}
                        onClick={() => {
                            setAddMenuAnchor(null);
                            addEntry(event.eventType);
                        }}
                    >
                        {event.label}
                    </MenuItem>
                ))}
            </Menu>
        </Box>
    );
}

/**
 * Expansion follows the entries it describes when one is removed: the removed
 * index drops out and every index above it moves down one. Without the shift a
 * removal would silently expand or collapse the wrong entry -- the same
 * off-by-one that index-keyed rows always invite.
 */
function shiftExpandedAfterRemoval(
    expanded: ReadonlySet<number>,
    removed: number,
): ReadonlySet<number> {
    const next = new Set<number>();
    for (const index of expanded) {
        if (index < removed) {
            next.add(index);
        } else if (index > removed) {
            next.add(index - 1);
        }
    }
    return next;
}
