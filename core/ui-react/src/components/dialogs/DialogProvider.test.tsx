import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {StrictMode, useEffect} from "react";
import {describe, expect, it, vi} from "vitest";

import {DialogProvider} from "./DialogProvider";
import {useDialogs, type Confirmation} from "./dialogs";

function ConfirmationTrigger({onResult}: {onResult: (result: string) => void}) {
    const dialogs = useDialogs();

    return (
        <button
            onClick={async () => {
                onResult(
                    await dialogs.confirm({
                        message: "Delete this search?",
                        title: "Delete search",
                    }),
                );
            }}
            type="button"
        >
            Delete
        </button>
    );
}

describe("DialogProvider", () => {
    it("should expose an accessible confirmation dialog and return a typed result", async () => {
        const onResult = vi.fn();
        render(
            <DialogProvider>
                <ConfirmationTrigger onResult={onResult} />
            </DialogProvider>,
        );

        fireEvent.click(screen.getByRole("button", {name: "Delete"}));

        expect(
            screen.getByRole("dialog", {name: "Delete search"}),
        ).toBeInTheDocument();
        expect(screen.getByText("Delete this search?")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", {name: "Confirm"}));

        await vi.waitFor(() =>
            expect(onResult).toHaveBeenCalledWith("confirmed"),
        );
    });

    // FM maintenance: two overlapping `confirm()` calls used to overwrite each
    // other's pending confirmation, dropping the first caller's `resolve` so
    // its promise never settled (the duplicate-movie probe in `sendFlow.ts`
    // could leave a send neither happening nor reporting).
    it("should queue a second confirmation instead of dropping the first", async () => {
        const settled: string[] = [];
        function DoubleTrigger() {
            const dialogs = useDialogs();
            return (
                <button
                    onClick={() => {
                        void dialogs
                            .confirm({message: "First?", title: "First"})
                            .then((result) => settled.push(`first:${result}`));
                        void dialogs
                            .confirm({message: "Second?", title: "Second"})
                            .then((result) => settled.push(`second:${result}`));
                    }}
                    type="button"
                >
                    Open two
                </button>
            );
        }

        render(
            <DialogProvider>
                <DoubleTrigger />
            </DialogProvider>,
        );

        fireEvent.click(screen.getByRole("button", {name: "Open two"}));

        expect(screen.getByRole("dialog", {name: "First"})).toBeInTheDocument();
        expect(screen.queryByText("Second?")).toBeNull();
        const firstConfirmButton = screen.getByRole("button", {
            name: "Confirm",
        });

        fireEvent.click(firstConfirmButton);
        await vi.waitFor(() => expect(settled).toContain("first:confirmed"));

        expect(
            screen.getByRole("dialog", {name: "Second"}),
        ).toBeInTheDocument();
        // The next confirmation must mount a fresh dialog rather than swapping
        // its text in under the user's focus: an in-place swap lets a second
        // Enter press dismiss a dialog the user never saw, and screen readers
        // never re-announce it.
        expect(screen.getByRole("button", {name: "Confirm"})).not.toBe(
            firstConfirmButton,
        );

        fireEvent.click(screen.getByRole("button", {name: "Cancel"}));
        await vi.waitFor(() => expect(settled).toContain("second:cancelled"));

        expect(settled).toEqual(["first:confirmed", "second:cancelled"]);
    });

    it("should keep the context value identity stable across an open and close", async () => {
        const seen: unknown[] = [];
        function IdentityProbe() {
            const dialogs = useDialogs();
            seen.push(dialogs);
            return (
                <button
                    onClick={() => {
                        void dialogs.confirm({
                            message: "Delete this search?",
                            title: "Delete search",
                        });
                    }}
                    type="button"
                >
                    Open
                </button>
            );
        }

        render(
            <DialogProvider>
                <IdentityProbe />
            </DialogProvider>,
        );

        fireEvent.click(screen.getByRole("button", {name: "Open"}));
        fireEvent.click(screen.getByRole("button", {name: "Confirm"}));
        await vi.waitFor(() =>
            expect(screen.queryByText("Delete this search?")).toBeNull(),
        );

        expect(seen.length).toBeGreaterThan(0);
        for (const value of seen) {
            expect(value).toBe(seen[0]);
        }
    });

    it("should settle a still-pending confirmation when the provider unmounts", async () => {
        const onResult = vi.fn();
        const {unmount} = render(
            <DialogProvider>
                <ConfirmationTrigger onResult={onResult} />
            </DialogProvider>,
        );

        fireEvent.click(screen.getByRole("button", {name: "Delete"}));
        expect(screen.getByRole("dialog")).toBeInTheDocument();

        unmount();

        await vi.waitFor(() =>
            expect(onResult).toHaveBeenCalledWith("cancelled"),
        );
    });

    // React runs a child's effects before its parent's, so StrictMode's
    // dev-only effect replay interleaves a child that confirms from a mount
    // effect with the provider's own mount and cleanup. The cleanup must leave
    // no half-open state behind, or the replayed `confirm()` renders behind a
    // zombie dialog whose buttons answer nothing.
    it("should show exactly one working dialog under StrictMode's effect replay", async () => {
        const onResult = vi.fn();
        function ConfirmOnMount() {
            const dialogs = useDialogs();
            useEffect(() => {
                void dialogs
                    .confirm({
                        message: "Delete this search?",
                        title: "Delete search",
                    })
                    .then(onResult);
            }, [dialogs]);
            return null;
        }

        render(
            <StrictMode>
                <DialogProvider>
                    <ConfirmOnMount />
                </DialogProvider>
            </StrictMode>,
        );

        expect(screen.getAllByRole("dialog")).toHaveLength(1);

        fireEvent.click(screen.getByRole("button", {name: "Confirm"}));

        await vi.waitFor(() =>
            expect(onResult).toHaveBeenLastCalledWith("confirmed"),
        );
        await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    });

    it("should offer a third answer when a confirmation asks for one", async () => {
        const onResult = vi.fn();
        render(
            <DialogProvider>
                <Trigger
                    confirmation={{
                        title: "Unsaved changes",
                        message: "Do you want to save before leaving?",
                        confirmLabel: "Save",
                        denyLabel: "Discard",
                        cancelLabel: "Cancel",
                        testId: "unsaved",
                    }}
                    onResult={onResult}
                />
            </DialogProvider>,
        );

        fireEvent.click(screen.getByRole("button", {name: "Open"}));
        expect(screen.getByTestId("unsaved")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", {name: "Discard"}));
        await vi.waitFor(() => expect(onResult).toHaveBeenCalledWith("denied"));
    });

    it("should render an acknowledge-only dialog with its message list", async () => {
        const onResult = vi.fn();
        render(
            <DialogProvider>
                <Trigger
                    confirmation={{
                        title: "Config validation failed",
                        message: "These errors need to be fixed.",
                        details: ["Port must be a number", "Host is required"],
                        confirmLabel: "OK",
                        variant: "acknowledge",
                    }}
                    onResult={onResult}
                />
            </DialogProvider>,
        );

        fireEvent.click(screen.getByRole("button", {name: "Open"}));
        expect(screen.getByText("Port must be a number")).toBeInTheDocument();
        expect(screen.getByText("Host is required")).toBeInTheDocument();
        expect(screen.queryByRole("button", {name: "Cancel"})).toBeNull();

        fireEvent.click(screen.getByRole("button", {name: "OK"}));
        await vi.waitFor(() =>
            expect(onResult).toHaveBeenCalledWith("confirmed"),
        );
    });

    it("should wrap a long unbroken message and detail instead of clipping", async () => {
        const onResult = vi.fn();
        const longToken = `http://example.com/${"a".repeat(200)}`;
        render(
            <DialogProvider>
                <Trigger
                    confirmation={{
                        title: "Connection check failed",
                        message: longToken,
                        details: [longToken],
                        confirmLabel: "OK",
                        variant: "acknowledge",
                    }}
                    onResult={onResult}
                />
            </DialogProvider>,
        );

        fireEvent.click(screen.getByRole("button", {name: "Open"}));

        const matches = screen.getAllByText(longToken);
        expect(matches).toHaveLength(2);
        for (const element of matches) {
            expect(getComputedStyle(element).overflowWrap).toBe("break-word");
        }

        // FM-122: close the dialog instead of abandoning it mid-transition --
        // see MAINTENANCE.md's DialogProvider.test.tsx teardown-race entry,
        // which names this test's previously-unawaited open dialog as the
        // likely trigger. The class-wide `afterEach(cleanup)` guard in
        // vitest.setup.ts no longer depends on this, but there is no reason
        // to leave a still-open dialog behind when the test is done with it.
        fireEvent.click(screen.getByRole("button", {name: "OK"}));
        await vi.waitFor(() =>
            expect(onResult).toHaveBeenCalledWith("confirmed"),
        );
    });

    // FM-122 regression: this test intentionally leaves its dialog open and
    // mid-transition, unawaited and unmounted -- the shape the "should wrap a
    // long unbroken message" test above used to have before this task closed
    // it, and the trigger FM-111 characterised. Left mounted, that dialog's
    // MUI FocusTrap keeps its
    // 50ms focus-loss polling `setInterval` alive
    // (@mui/material/Unstable_TrapFocus/FocusTrap.js:234), cleared only by
    // the component's effect-cleanup on unmount. Left pending across a jsdom
    // environment teardown, that interval's callback
    // (`getActiveElement`/`contain` -> tabbable-element lookup) goes on to
    // resolve a document whose `defaultView` is now null and falls back to
    // the bare, now-deleted global `window` binding
    // (`@mui/utils/ownerWindow.js`: `doc.defaultView || window`), throwing
    // "ReferenceError: window is not defined" -- the exact signature FM-111
    // characterised. (The Fade transition's own pending `setTimeout` is a
    // separate, harmless leftover: react-transition-group's
    // `cancelNextCallback` only flips an `active` flag -- see
    // `node_modules/react-transition-group/cjs/Transition.js` `cancel`/
    // `setNextCallback` -- it never calls `clearTimeout`, so that timer
    // always outlives unmount by design and its callback is an inert no-op
    // once cancelled; it is not part of this regression.)
    //
    // The class-wide guard in vitest.setup.ts (an `afterEach(cleanup)`
    // covering every test file) unmounts this before the next test runs,
    // which synchronously fires FocusTrap's effect cleanup and removes the
    // dialog from the document. The next test below observes exactly that:
    // without the guard, `render()`'s container from this test is never
    // unmounted, so the dialog (and its still-live interval) survives into
    // the next test.
    it("leaves a mid-transition dialog open, unawaited (sets up the regression below)", () => {
        // Isolate this test's own dialog from any earlier test's DOM: this
        // manual `cleanup()` is test hygiene local to this test, not the
        // guard under test.
        cleanup();

        const onResult = vi.fn();
        render(
            <DialogProvider>
                <Trigger
                    confirmation={{
                        title: "Leave without saving?",
                        message: "Changes will be lost.",
                        confirmLabel: "Leave",
                        variant: "acknowledge",
                    }}
                    onResult={onResult}
                />
            </DialogProvider>,
        );

        fireEvent.click(screen.getByRole("button", {name: "Open"}));
        expect(screen.getByRole("dialog")).toBeInTheDocument();

        // Deliberately: no unmount, no awaited close, no manual cleanup()
        // call. Whether this file's teardown guard exists is exactly what
        // the next test observes.
    });

    it("regression: an abandoned mid-transition dialog does not survive into the next test", () => {
        expect(screen.queryByRole("dialog")).toBeNull();
    });
});

function Trigger({
    confirmation,
    onResult,
}: {
    confirmation: Confirmation;
    onResult: (result: string) => void;
}) {
    const dialogs = useDialogs();

    return (
        <button
            onClick={async () => {
                onResult(await dialogs.confirm(confirmation));
            }}
            type="button"
        >
            Open
        </button>
    );
}
