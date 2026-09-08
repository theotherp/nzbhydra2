import {useCallback, useRef, useState} from "react";

/**
 * The state one open modal transaction carries: the configuration index the
 * transaction was opened over (`null` while a *new* entry is being composed),
 * the transaction's own identity, and the draft the dialog edits. `Extra` is
 * whatever the call site needs alongside it -- `CategoriesTable`'s `isNew`,
 * `IndexersConfigTab`'s preset `info`.
 */
type ListEditorTransaction<
    Value,
    Extra extends object = object,
    Index extends number | null = number | null,
> = {
    index: Index;
    token: number;
    value: Value;
} & Extra;

/**
 * One guarded commit. `entryCount` is the length of the array *as the form
 * holds it now*, and passing it is what asks for the index-range guard; the
 * sections that never had one (`DownloadersSection`, `ExternalToolsSection`,
 * `IndexersConfigTab`) leave it out, because there a commit whose index no
 * longer exists still writes an unchanged array and still marks the form dirty,
 * and turning that into a silent no-op would be a behaviour change this hook is
 * not entitled to make (FM-191, packet's "two divergences" note).
 */
type ListEditorCommit<Index extends number | null = number | null> = {
    /** The token the dialog captured when its transaction was opened. */
    token: number;
    index: Index;
    /** Present only where the call site guards a vanished index. */
    entryCount?: number;
    /** The caller's array write. Runs only if every guard passes. */
    write: () => void;
};

export type ListEditorTransactionApi<
    Value,
    Extra extends object = object,
    Index extends number | null = number | null,
> = {
    /** The open transaction, or `null`. Drives whether the dialog renders. */
    editing: ListEditorTransaction<Value, Extra, Index> | null;
    /** Opens a transaction over `index`, superseding whatever was open. */
    open: (index: Index, value: Value, extra?: Extra) => void;
    /** Ends the transaction: no commit carrying its token can apply afterwards. */
    close: () => void;
    /**
     * Cancel (including Escape and a backdrop click). `rollback` is run with
     * the transaction being abandoned *before* it is closed, which is where
     * `CategoriesTable` undoes the placeholder its Add pushed into the real
     * array (ADR-0034); the sections whose new entry has no array slot until
     * Submit pass nothing and this is exactly `close`.
     */
    cancel: (
        rollback?: (
            editing: ListEditorTransaction<Value, Extra, Index>,
        ) => void,
    ) => void;
    /**
     * Invalidates the current token without touching `editing`. A delete calls
     * it before writing: a removal shifts every following index, so no
     * transaction opened before it may still commit by the index it captured.
     */
    invalidate: () => void;
    /** Whether `token` is still the transaction allowed to act. */
    isCurrent: (token: number) => boolean;
    /**
     * Applies `write` and closes, but only for a transaction that is still
     * current and (where `entryCount` is given) whose index still exists.
     * Returns whether the write ran, which is what the two sections that move
     * focus after a commit key their focus request on.
     */
    commit: (request: ListEditorCommit<Index>) => boolean;
};

/**
 * The modal-transaction lifecycle FM-064 established and FM-065, FM-066,
 * FM-105 and FM-119 each hand-copied: an `{index, token, value}` state, a
 * monotonic token bumped on every open, close and delete, and a commit that
 * drops a resolved transaction whose token is stale or whose row is gone.
 *
 * **Why a token at all.** A dialog's `onSubmit` is a closure captured by a
 * render that a later one may have replaced, and three of the six dialogs
 * additionally `await` a backend check between the admin's click and that
 * callback -- a connection check (`DownloaderDialog`), an *arr configure call
 * (`ExternalToolDialog`), a connection plus capability check
 * (`IndexerDialog`). FM-064's first review found the un-tokened version of
 * this: cancelling or deleting during an in-flight check could still write, or
 * resurrect, the entry the check resolved for. Comparing a per-transaction
 * token against the counter is what makes an abandoned transaction inert.
 *
 * **What stays with the caller.** The array write itself, and with it the
 * merge-vs-replace choice (`IndexersConfigTab` replaces an entry wholesale
 * because a failed capability check *removes* keys a spread would resurrect;
 * everyone else spreads over the stored entry so a key this UI has no control
 * for survives, ADR-0003), the confirm dialogs, the placeholder add and its
 * unmount rollback, and every per-section draft field. A hook that owned the
 * write could not serve both merge strategies.
 *
 * **The counter is monotonic and only ever compared for equality**, so an
 * extra bump (a delete that both invalidates and closes) is inert; it can only
 * ever make more transactions stale, never fewer.
 */
export function useListEditorTransaction<
    Value,
    Extra extends object = object,
    Index extends number | null = number | null,
>(): ListEditorTransactionApi<Value, Extra, Index> {
    const [editing, setEditing] = useState<ListEditorTransaction<
        Value,
        Extra,
        Index
    > | null>(null);
    const transactionRef = useRef(0);

    const isCurrent = useCallback(
        (token: number) => token === transactionRef.current,
        [],
    );

    const invalidate = useCallback(() => {
        transactionRef.current += 1;
    }, []);

    // Stable on purpose: `IndexersConfigTab` hands its `editEntry` -- which
    // closes over `open` -- down to every memoized `IndexerTableRow`, so a
    // fresh closure per render would re-render the whole list on every
    // keystroke and quietly undo FM-168.
    const open = useCallback((index: Index, value: Value, extra?: Extra) => {
        transactionRef.current += 1;
        setEditing({
            index,
            token: transactionRef.current,
            value,
            // The one cast in this file: TypeScript cannot see that spreading
            // a generic `Extra` into these three keys produces the
            // intersection, though it does.
            ...(extra ?? ({} as Extra)),
        } as ListEditorTransaction<Value, Extra, Index>);
    }, []);

    const close = useCallback(() => {
        transactionRef.current += 1;
        setEditing(null);
    }, []);

    const cancel = (
        rollback?: (
            editing: ListEditorTransaction<Value, Extra, Index>,
        ) => void,
    ) => {
        if (editing !== null) {
            rollback?.(editing);
        }
        close();
    };

    const commit = ({
        token,
        index,
        entryCount,
        write,
    }: ListEditorCommit<Index>) => {
        if (!isCurrent(token)) {
            return false;
        }
        if (index !== null && entryCount !== undefined && index >= entryCount) {
            // The row this transaction was opened over is gone. Committing
            // would either write the draft onto whoever shifted into its index
            // or silently drop it; both are worse than discarding an edit the
            // admin can redo. (A delete invalidates the token, so this is the
            // second line of defence, not the first.)
            close();
            return false;
        }
        write();
        close();
        return true;
    };

    return {cancel, close, commit, editing, invalidate, isCurrent, open};
}
