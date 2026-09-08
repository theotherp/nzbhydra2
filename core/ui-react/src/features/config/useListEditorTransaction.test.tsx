import {act, cleanup, renderHook} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";

import {useListEditorTransaction} from "./useListEditorTransaction";

type Entry = {name: string};

afterEach(cleanup);

/**
 * The staleness rules FM-064's review cycle established, now owned by one hook
 * for all six config list editors (FM-191).
 *
 * These are unit cases on purpose. Three of the six dialogs `await` a backend
 * check between the admin's click and `onSubmit`, so their sections can reach
 * the stale states through their own suites; `CustomMappingsSection`'s dialog
 * is synchronous, so for that one the proof lives here (and in the one
 * section-level case `SearchingConfigTab.test.tsx` can drive).
 */
describe("useListEditorTransaction", () => {
    it("should drop a commit whose token was superseded by a later transaction", () => {
        const {result} = renderHook(() => useListEditorTransaction<Entry>());
        const written: Entry[] = [];

        act(() => result.current.open(0, {name: "first"}));
        const stale = result.current.editing?.token ?? -1;
        // A second dialog opened over another row while the first one's check
        // was still running.
        act(() => result.current.open(1, {name: "second"}));

        let applied = true;
        act(() => {
            applied = result.current.commit({
                token: stale,
                index: 0,
                entryCount: 2,
                write: () => written.push({name: "first"}),
            });
        });

        expect(applied).toBe(false);
        expect(written).toEqual([]);
        // The transaction that superseded it is untouched: a dropped commit
        // must not close somebody else's dialog.
        expect(result.current.editing?.index).toBe(1);
    });

    it("should drop a commit whose index no longer exists, and close its dialog", () => {
        const {result} = renderHook(() => useListEditorTransaction<Entry>());
        const written: Entry[] = [];

        act(() => result.current.open(2, {name: "third"}));
        const token = result.current.editing?.token ?? -1;

        let applied = true;
        act(() => {
            applied = result.current.commit({
                token,
                index: 2,
                // The array is two entries long now: the row this transaction
                // was opened over is gone.
                entryCount: 2,
                write: () => written.push({name: "third"}),
            });
        });

        expect(applied).toBe(false);
        expect(written).toEqual([]);
        expect(result.current.editing).toBeNull();
    });

    it("should keep a commit whose index is still in range", () => {
        const {result} = renderHook(() => useListEditorTransaction<Entry>());
        const written: Entry[] = [];

        act(() => result.current.open(1, {name: "second"}));
        const token = result.current.editing?.token ?? -1;

        let applied = false;
        act(() => {
            applied = result.current.commit({
                token,
                index: 1,
                entryCount: 2,
                write: () => written.push({name: "second"}),
            });
        });

        expect(applied).toBe(true);
        expect(written).toEqual([{name: "second"}]);
        expect(result.current.editing).toBeNull();
    });

    it("should apply a commit with no entry count even where the index is out of range", () => {
        // The three sections that never guarded a vanished index
        // (`DownloadersSection`, `ExternalToolsSection`, `IndexersConfigTab`)
        // pass no `entryCount`, and their commit must stay the unchanged-array
        // write it has always been rather than becoming a silent no-op.
        const {result} = renderHook(() => useListEditorTransaction<Entry>());
        const written: Entry[] = [];

        act(() => result.current.open(5, {name: "gone"}));
        const token = result.current.editing?.token ?? -1;

        let applied = false;
        act(() => {
            applied = result.current.commit({
                token,
                index: 5,
                write: () => written.push({name: "gone"}),
            });
        });

        expect(applied).toBe(true);
        expect(written).toEqual([{name: "gone"}]);
    });

    it("should make an open transaction on a later row stale once a delete invalidates it", () => {
        const {result} = renderHook(() => useListEditorTransaction<Entry>());
        const written: Entry[] = [];

        act(() => result.current.open(2, {name: "third"}));
        const token = result.current.editing?.token ?? -1;
        // The delete path: a removal shifts every following index, so the row
        // this transaction captured as 2 is no longer the row it was opened
        // over. `invalidate` leaves `editing` alone -- `AuthUsersSection`'s
        // delete does not close a dialog it did not open.
        act(() => result.current.invalidate());

        expect(result.current.isCurrent(token)).toBe(false);
        expect(result.current.editing?.index).toBe(2);

        let applied = true;
        act(() => {
            applied = result.current.commit({
                token,
                index: 2,
                // Still in range after the delete -- and still dropped, which
                // is the point: the entry at index 2 is a different one now.
                entryCount: 3,
                write: () => written.push({name: "third"}),
            });
        });

        expect(applied).toBe(false);
        expect(written).toEqual([]);
    });

    it("should commit a fresh transaction opened after a close", () => {
        const {result} = renderHook(() => useListEditorTransaction<Entry>());
        const written: Entry[] = [];

        act(() => result.current.open(0, {name: "first"}));
        const abandoned = result.current.editing?.token ?? -1;
        act(() => result.current.close());
        act(() => result.current.open(0, {name: "first, again"}));
        const fresh = result.current.editing?.token ?? -1;

        expect(fresh).not.toBe(abandoned);
        expect(result.current.isCurrent(fresh)).toBe(true);

        let applied = false;
        act(() => {
            applied = result.current.commit({
                token: fresh,
                index: 0,
                entryCount: 1,
                write: () => written.push({name: "first, again"}),
            });
        });

        expect(applied).toBe(true);
        expect(written).toEqual([{name: "first, again"}]);
        expect(result.current.editing).toBeNull();
    });

    it("should run cancel's rollback with the abandoned transaction before closing it", () => {
        // `CategoriesTable`'s placeholder rollback (ADR-0034) is the only
        // caller that passes one, and it needs the transaction's own `isNew`
        // and index, not whatever is open by the time the state has settled.
        const {result} = renderHook(() =>
            useListEditorTransaction<Entry, {isNew: boolean}, number>(),
        );
        const rolledBack: {index: number; isNew: boolean}[] = [];

        act(() => result.current.open(3, {name: "placeholder"}, {isNew: true}));
        act(() =>
            result.current.cancel((abandoned) =>
                rolledBack.push({
                    index: abandoned.index,
                    isNew: abandoned.isNew,
                }),
            ),
        );

        expect(rolledBack).toEqual([{index: 3, isNew: true}]);
        expect(result.current.editing).toBeNull();
    });

    it("should carry the call site's extra fields on the open transaction", () => {
        const {result} = renderHook(() =>
            useListEditorTransaction<Entry, {info?: readonly string[]}>(),
        );

        act(() =>
            result.current.open(null, {name: "new"}, {info: ["a preset note"]}),
        );

        expect(result.current.editing).toMatchObject({
            index: null,
            info: ["a preset note"],
            value: {name: "new"},
        });
    });

    it("should keep open, close, invalidate and isCurrent stable across renders", () => {
        // `IndexersConfigTab` hands a callback closing over `open` down to
        // every memoized `IndexerTableRow`; a fresh identity per render would
        // re-render the whole list on every keystroke and undo FM-168.
        const {rerender, result} = renderHook(() =>
            useListEditorTransaction<Entry>(),
        );
        const first = result.current;

        act(() => result.current.open(0, {name: "first"}));
        rerender();

        expect(result.current.open).toBe(first.open);
        expect(result.current.close).toBe(first.close);
        expect(result.current.invalidate).toBe(first.invalidate);
        expect(result.current.isCurrent).toBe(first.isCurrent);
    });
});
