import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import KeyIcon from "@mui/icons-material/Key";
import KeyOffIcon from "@mui/icons-material/KeyOff";
import {
    Button,
    Chip,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";
import {useEffect, useRef, useState} from "react";
import {useFormContext, useWatch} from "react-hook-form";

import type {ConfigValues} from "../../../api/config/schema";
import {useDialogs} from "../../../components/dialogs/dialogs";
import {
    defaultUser,
    userLegend,
    userPasswordState,
    userRights,
    usersOf,
    USERS_PATH,
    USER_PASSWORD_STATE_LABELS,
    type UserAuthConfigValues,
} from "./authSettings";
import {UserDialog} from "./UserDialog";

const USERS_TABLE_TEST_ID = "config-users-table";
const ADD_LABEL = "Add new user";

type Editing = {
    /** `null` while a *new* user is being composed. */
    index: number | null;
    /** The transaction's identity, compared before a commit is applied. */
    token: number;
    value: UserAuthConfigValues;
};

/**
 * `F-CONFIG-AUTH`'s Users section (FM-105): legacy's stack of `users` repeat
 * fieldsets (`config-fields-service.js:2295-2374`) as one table, with each row
 * edited through `UserDialog`'s modal transaction.
 *
 * **What a row is bound to.** Nothing in the table binds to a configuration
 * path -- there is not one form control in it. Every cell is derived text, and
 * both actions carry the entry's *configuration index*, the same number the
 * dialog commits back through. Rows are painted in configuration order and are
 * never sorted or filtered, so display position and config index are the same
 * number here by construction; the code still passes the index explicitly
 * rather than relying on that.
 *
 * **What the table may show.** A user's password never reaches this component
 * in any renderable form: the Password column is
 * `USER_PASSWORD_STATE_LABELS[userPasswordState(entry, authType)]`, one of four
 * fixed words. Not the stored hash, not a typed password, not even the
 * `***UNCHANGED***` marker itself.
 *
 * **Why the array's shape is untouched.** `auth.users` stays exactly what the
 * server sent -- an array of records at `auth.users.<index>`, edited whole.
 * `C-CONFIG-REVIEW`'s change summary depends on that: it dispatches on a
 * value's shape and refuses to descend into an array of records, which is what
 * keeps per-user credentials out of the review panel. Flattening the users into
 * scalar paths to make this table's job easier would have punched a hole in
 * that defence.
 */
export function AuthUsersSection() {
    const {getValues, setValue} = useFormContext<ConfigValues>();
    const dialogs = useDialogs();
    const authType = useWatch<ConfigValues>({name: "auth.authType"});
    const entries = usersOf(useWatch<ConfigValues>({name: USERS_PATH}));
    const [editing, setEditing] = useState<Editing | null>(null);
    /**
     * The identity of the transaction currently allowed to commit. Every open
     * and every close bumps it, so a commit from a dialog that was already
     * cancelled or replaced is dropped. `UserDialog` has no asynchronous step
     * of its own, but `onSubmit` is still a closure captured by a render that a
     * later one may have replaced.
     */
    const transactionRef = useRef(0);
    const tableRef = useRef<HTMLTableElement | null>(null);
    /**
     * Bumped to ask for focus on the table. §5's repeat-section focus note,
     * made concrete: adding and deleting both destroy the control that was
     * focused (the dialog's Save, the row's Delete), so without this, focus
     * falls to the document body and a keyboard user restarts at the top of the
     * page.
     */
    const [focusRequest, setFocusRequest] = useState(0);

    useEffect(() => {
        if (focusRequest === 0) {
            return;
        }
        // Deferred by one macrotask, and that is not a guess: MUI's focus trap
        // restores focus to whatever opened the dialog in its own effect
        // cleanup, and for the delete path (whose confirmation lives in an
        // ancestor `DialogProvider`) that cleanup runs *after* this effect. The
        // node it restores to has just been unmounted, so an immediate focus
        // call here would be undone and land nowhere. Zero delay: this only has
        // to fall behind the same commit's remaining work, not wait for a
        // duration.
        const handle = setTimeout(() => tableRef.current?.focus(), 0);
        return () => clearTimeout(handle);
    }, [focusRequest]);

    const openTransaction = (
        index: number | null,
        value: UserAuthConfigValues,
    ) => {
        transactionRef.current += 1;
        setEditing({index, token: transactionRef.current, value});
    };

    const closeTransaction = () => {
        transactionRef.current += 1;
        setEditing(null);
    };

    const write = (next: UserAuthConfigValues[]) =>
        setValue(USERS_PATH, next as never, {shouldDirty: true});

    /** The array as the form holds it *now*, never a value a render captured. */
    const currentEntries = () => usersOf(getValues(USERS_PATH));

    const commit = (
        token: number,
        index: number | null,
        entry: UserAuthConfigValues,
    ) => {
        if (token !== transactionRef.current) {
            return;
        }
        const current = currentEntries();
        if (index !== null && index >= current.length) {
            // The row this transaction was opened over is gone. Committing
            // would either write this user's fields onto whoever shifted into
            // its index or silently drop them; both are worse than discarding
            // an edit the admin can redo. (`remove` invalidates the token, so
            // this is the second line of defence, not the first.)
            closeTransaction();
            return;
        }
        write(
            index === null
                ? [...current, entry]
                : current.map((existing, entryIndex) =>
                      // Spread over the stored entry rather than replacing it:
                      // `ConfigWeb.setConfig` writes the whole file back, so a
                      // key this UI has no control for must survive an edit
                      // (ADR-0003).
                      entryIndex === index ? {...existing, ...entry} : existing,
                  ),
        );
        closeTransaction();
        setFocusRequest((request) => request + 1);
    };

    const remove = async (index: number) => {
        const entry = currentEntries()[index];
        if (entry === undefined) {
            return;
        }
        const answer = await dialogs.confirm({
            title: "Delete user",
            message: `Delete the user "${userLegend(entry)}"?`,
            confirmLabel: "Delete",
            testId: "config-user-delete-confirm",
        });
        if (answer !== "confirmed") {
            return;
        }
        // A removal shifts every following index, so no transaction opened
        // before it may still commit by the index it captured.
        transactionRef.current += 1;
        write(
            currentEntries().filter(
                (_entry, entryIndex) => entryIndex !== index,
            ),
        );
        setFocusRequest((request) => request + 1);
    };

    return (
        <>
            <TableContainer
                // Whatever cannot fit scrolls here rather than pushing the page
                // sideways (ADR-0029). Which is close to nothing: three columns
                // at 390px measured about 370px wide with the row's actions in
                // its first cell, so the only thing that can ever be scrolled
                // out of view is the tail of the Password chip -- never a
                // control.
                sx={{overflowX: "auto"}}
            >
                <Table
                    aria-label="Configured users"
                    data-testid={USERS_TABLE_TEST_ID}
                    ref={tableRef}
                    size="small"
                    // Focusable only programmatically: it is where focus is put
                    // after an add or a delete, and it is not in the tab order.
                    tabIndex={-1}
                >
                    <TableHead>
                        <TableRow>
                            {/*
                             * Three columns, not four: the row's Edit and
                             * Delete live in the User cell rather than in an
                             * Actions column of their own. A fourth column was
                             * measured at 390px and put exactly those two
                             * buttons off-canvas behind a scrollbar with no
                             * affordance -- the rendering ADR-0029 refused --
                             * and no amount of shortening the chips bought back
                             * the ~150px it needed. Attaching the actions to the
                             * name they act on costs one column and is the same
                             * shape `IndexerTable` uses for its own name cell.
                             */}
                            <TableCell>User</TableCell>
                            <TableCell>Rights</TableCell>
                            <TableCell>Password</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {entries.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={3}
                                    data-testid="config-users-empty"
                                >
                                    <Typography variant="body2">
                                        No users configured yet.
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : null}
                        {entries.map((entry, index) => (
                            <UserTableRow
                                authType={authType}
                                entry={entry}
                                // The index is the key on purpose, as it was in
                                // `RepeatSection`: a username is editable and
                                // row N always shows whatever is at index N.
                                key={index}
                                index={index}
                                onDelete={() => void remove(index)}
                                onEdit={() =>
                                    openTransaction(
                                        index,
                                        structuredClone(entry),
                                    )
                                }
                            />
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            <Button
                data-testid="config-users-add"
                onClick={() => openTransaction(null, defaultUser())}
                sx={{mt: 2}}
                type="button"
                variant="outlined"
            >
                {ADD_LABEL}
            </Button>
            {editing === null ? null : (
                <UserDialog
                    authType={authType}
                    existingUsernames={otherUsernames(entries, editing.index)}
                    initialValue={editing.value}
                    isNew={editing.index === null}
                    onCancel={closeTransaction}
                    onSubmit={(entry) =>
                        commit(editing.token, editing.index, entry)
                    }
                />
            )}
        </>
    );
}

/** The uniqueness check ignores the entry being edited itself. */
function otherUsernames(
    entries: readonly UserAuthConfigValues[],
    index: number | null,
): string[] {
    return entries
        .map((entry, entryIndex) =>
            entryIndex === index || typeof entry.username !== "string"
                ? ""
                : entry.username,
        )
        .filter((username) => username !== "");
}

/**
 * One user's row. `index` is the entry's index in the configuration array and
 * is what both actions carry.
 *
 * Rights and password state are both told in words. The chips carry no colour
 * at all, and the password chip's colour only repeats what its label and icon
 * already say, so nothing in this row is readable to a reader who can
 * distinguish the palette and unreadable to one who cannot.
 */
function UserTableRow({
    authType,
    entry,
    index,
    onDelete,
    onEdit,
}: {
    authType: unknown;
    entry: UserAuthConfigValues;
    index: number;
    onDelete: () => void;
    onEdit: () => void;
}) {
    const legend = userLegend(entry);
    const passwordState = userPasswordState(entry, authType);

    return (
        <TableRow data-testid={`config-user-entry-${index}`}>
            <TableCell>
                <Stack alignItems="flex-start" spacing={0.5}>
                    <Typography
                        data-testid={`config-user-username-${index}`}
                        // A username is free text and can be long; it wraps
                        // inside the cell rather than widening the column.
                        sx={{overflowWrap: "anywhere"}}
                        variant="body2"
                    >
                        {legend}
                    </Typography>
                    {/*
                     * Both buttons keep a visible word and name the user only
                     * in their accessible name: "Delete some-long-name" on
                     * every row would set the column's width from the longest
                     * username twice over, and the name is directly above them
                     * anyway. The visible text is the first word of the
                     * accessible name, so the two agree (WCAG 2.5.3).
                     */}
                    <Stack
                        // Side by side wherever there is room; stacked on a
                        // phone, where two buttons abreast would widen this
                        // column past what the viewport has left for it. Pure
                        // CSS: one button per action either way.
                        direction={{xs: "column", sm: "row"}}
                        spacing={{sm: 1}}
                    >
                        <Button
                            aria-label={`Edit ${legend}`}
                            data-testid={`config-user-edit-${index}`}
                            onClick={onEdit}
                            size="small"
                            startIcon={<EditIcon />}
                            type="button"
                        >
                            Edit
                        </Button>
                        <Button
                            aria-label={`Delete ${legend}`}
                            color="error"
                            data-testid={`config-user-delete-${index}`}
                            onClick={onDelete}
                            size="small"
                            startIcon={<DeleteIcon />}
                            type="button"
                        >
                            Delete
                        </Button>
                    </Stack>
                </Stack>
            </TableCell>
            <TableCell data-testid={`config-user-rights-${index}`}>
                <Stack
                    direction="row"
                    spacing={0.5}
                    sx={{flexWrap: "wrap"}}
                    useFlexGap
                >
                    {userRights(entry).map((right) => (
                        <Chip
                            data-testid={`config-user-right-${index}-${right.key}`}
                            key={right.key}
                            label={right.label}
                            size="small"
                            variant="outlined"
                        />
                    ))}
                </Stack>
            </TableCell>
            <TableCell data-testid={`config-user-password-${index}`}>
                <Chip
                    color={passwordState === "missing" ? "warning" : "default"}
                    icon={
                        passwordState === "stored" ? (
                            <KeyIcon />
                        ) : (
                            <KeyOffIcon />
                        )
                    }
                    label={USER_PASSWORD_STATE_LABELS[passwordState]}
                    size="small"
                    variant="outlined"
                />
            </TableCell>
        </TableRow>
    );
}
