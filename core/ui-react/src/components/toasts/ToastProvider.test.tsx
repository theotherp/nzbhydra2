import {Button, Dialog, DialogActions, DialogContent} from "@mui/material";
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import {useState} from "react";
import {afterEach, describe, expect, it, vi} from "vitest";

import {ToastProvider} from "./ToastProvider";
import {useToasts, type DismissToast, type Toast} from "./toasts";

function ToastTrigger({label, toast}: {label: string; toast: Toast}) {
    const toasts = useToasts();

    return (
        <button onClick={() => toasts.showToast(toast)} type="button">
            {label}
        </button>
    );
}

afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

describe("ToastProvider", () => {
    it("should render a severity-labelled notification", () => {
        render(
            <ToastProvider>
                <ToastTrigger
                    label="Save"
                    toast={{message: "Saved search", severity: "success"}}
                />
            </ToastProvider>,
        );

        fireEvent.click(screen.getByRole("button", {name: "Save"}));

        expect(screen.getByRole("alert")).toHaveTextContent("Saved search");
    });

    it("should stack concurrent toasts in arrival order and dismiss each one on its own", async () => {
        vi.useFakeTimers({shouldAdvanceTime: true});
        render(
            <ToastProvider>
                <ToastTrigger
                    label="First"
                    toast={{message: "First message", severity: "info"}}
                />
                <ToastTrigger
                    label="Second"
                    toast={{
                        message: "Second message",
                        persistent: true,
                        severity: "warning",
                    }}
                />
                <ToastTrigger
                    label="Third"
                    toast={{message: "Third message", severity: "error"}}
                />
            </ToastProvider>,
        );

        fireEvent.click(screen.getByRole("button", {name: "First"}));
        await act(async () => {
            await vi.advanceTimersByTimeAsync(2_000);
        });
        fireEvent.click(screen.getByRole("button", {name: "Second"}));
        fireEvent.click(screen.getByRole("button", {name: "Third"}));

        // All three are on screen at once — a later toast neither replaces an
        // earlier one nor restarts its lifetime — inside one overlay, so they
        // cannot overlap each other.
        const alerts = screen.getAllByRole("alert");
        expect(alerts).toHaveLength(3);
        expect(alerts[0]).toHaveTextContent("First message");
        expect(alerts[1]).toHaveTextContent("Second message");
        expect(alerts[2]).toHaveTextContent("Third message");
        expect(
            alerts.every((alert) => alert.closest('[data-testid="toasts"]')),
        ).toBe(true);
        for (const alert of alerts) {
            expect(alert.querySelector("button")).not.toBeNull();
        }

        // The first toast's own 5s lifetime runs out 2s before the third's.
        await act(async () => {
            await vi.advanceTimersByTimeAsync(3_000);
        });
        expect(
            screen.getAllByRole("alert").map((alert) => alert.textContent),
        ).toEqual(["Second message", "Third message"]);

        await act(async () => {
            await vi.advanceTimersByTimeAsync(2_000);
        });
        const remaining = screen.getAllByRole("alert");
        expect(remaining).toHaveLength(1);
        expect(remaining[0]).toHaveTextContent("Second message");

        // A persistent toast never times out; it goes when it is dismissed.
        await act(async () => {
            await vi.advanceTimersByTimeAsync(60_000);
        });
        expect(screen.getByRole("alert")).toHaveTextContent("Second message");
        fireEvent.click(screen.getByRole("button", {name: /close/i}));
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("should keep a dialog's actions clickable while a long toast is open", () => {
        const onSubmit = vi.fn();
        render(
            <ToastProvider>
                <Dialog open>
                    <DialogContent>
                        Configure the external tool
                        <ToastTrigger
                            label="Test connection"
                            toast={{
                                message:
                                    "The connection test failed: " +
                                    "the configured host answered with a very long error ".repeat(
                                        12,
                                    ),
                                severity: "error",
                            }}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={onSubmit}>Submit</Button>
                    </DialogActions>
                </Dialog>
            </ToastProvider>,
        );

        fireEvent.click(screen.getByRole("button", {name: "Test connection"}));
        // Queried by role, which `aria-hidden` would defeat: the toast layer
        // stays in the accessibility tree while the dialog is open (FM-115).
        // The ancestor-chain cases below are the proof; this is the ordinary
        // consumer's view of it.
        expect(screen.getByRole("alert")).toBeInTheDocument();

        // jsdom does no layout or hit testing, so a click on a covered button
        // would "succeed" there whatever the provider does (FM-065's
        // reproduction was a real overlap). What is assertable — and what
        // fails against a provider whose Snackbar is an opaque fixed overlay
        // above the dialog — is that the toast overlay itself is transparent
        // to pointer input while the alert inside it stays a target. The
        // browser proof is the screenshot strip.
        const overlay = screen.getByTestId("toasts");
        expect(getComputedStyle(overlay).pointerEvents).toBe("none");
        expect(
            getComputedStyle(screen.getByTestId("toast")).pointerEvents,
        ).toBe("auto");

        fireEvent.click(screen.getByRole("button", {name: "Submit"}));
        expect(onSubmit).toHaveBeenCalledOnce();
    });

    it("should render a persistent toast under a custom testId and report its close", () => {
        const onClose = vi.fn();
        render(
            <ToastProvider>
                <ToastTrigger
                    label="Pile up"
                    toast={{
                        message: "3 notifications have piled up.",
                        onClose,
                        persistent: true,
                        severity: "info",
                        testId: "notification-toast",
                    }}
                />
            </ToastProvider>,
        );

        fireEvent.click(screen.getByRole("button", {name: "Pile up"}));

        const alert = screen.getByTestId("notification-toast");
        expect(alert).toHaveTextContent("3 notifications have piled up.");
        // ADR-0037: informational only — nothing inside the toast is
        // interactive besides the Alert's own close control.
        expect(alert.querySelector("a")).toBeNull();
        expect(alert.querySelectorAll("button")).toHaveLength(1);

        fireEvent.click(screen.getByRole("button", {name: /close/i}));
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(onClose).toHaveBeenCalledOnce();
    });

    it("should render a message as text with newlines as line breaks, never as HTML", () => {
        render(
            <ToastProvider>
                <ToastTrigger
                    label="Report"
                    toast={{
                        message: "First line\nSecond <b>line</b>",
                        severity: "info",
                    }}
                />
            </ToastProvider>,
        );

        fireEvent.click(screen.getByRole("button", {name: "Report"}));

        const alert = screen.getByRole("alert");
        expect(alert.querySelector("br")).not.toBeNull();
        expect(alert.querySelector("b")).toBeNull();
        expect(alert).toHaveTextContent("Second <b>line</b>");
    });

    it("should withdraw a toast through the handle it returned, once", () => {
        const onClose = vi.fn();
        let dismiss: DismissToast | undefined;

        function Withdrawer() {
            const {showToast} = useToasts();
            return (
                <button
                    onClick={() => {
                        dismiss = showToast({
                            message: "Still running",
                            onClose,
                            persistent: true,
                            severity: "info",
                        });
                    }}
                    type="button"
                >
                    Raise
                </button>
            );
        }

        render(
            <ToastProvider>
                <Withdrawer />
            </ToastProvider>,
        );
        fireEvent.click(screen.getByRole("button", {name: "Raise"}));
        expect(screen.getByRole("alert")).toBeInTheDocument();

        act(() => {
            dismiss?.();
            dismiss?.();
        });

        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(onClose).toHaveBeenCalledOnce();
    });
});

describe("ToastProvider reachability over an open modal (FM-115)", () => {
    /**
     * Announced is not the same as present. `ModalManager.add` marks every
     * sibling of an open `Modal` `aria-hidden="true"`, so an element
     * `getByTestId` happily returns can be wholly absent from the
     * accessibility tree — which is the state every toast raised over a dialog
     * shipped in until FM-115. Each case here walks the ancestor chain instead
     * of trusting the query, and each is paired with a control assertion that
     * the application subtree really is hidden in that scenario; without the
     * control the case would pass on a run where no modal ever hid anything.
     *
     * Same helper as `ConfigShell.test.tsx`'s (FM-101), deliberately copied
     * rather than shared: a test helper exported from one feature's spec into
     * a component's spec would couple them.
     */
    function ariaHiddenAncestor(element: Element): Element | null {
        for (
            let node: Element | null = element;
            node !== null;
            node = node.parentElement
        ) {
            if (node.getAttribute("aria-hidden") === "true") {
                return node;
            }
        }
        return null;
    }

    /**
     * The `ExternalToolDialog` / `DownloaderDialog` / `IndexerDialog` shape:
     * the dialog raises its own toast from a control inside itself, so the
     * toast is guaranteed to arrive while a modal is open. The outer subtree
     * stands for the application under the backdrop.
     */
    function DialogHarness({dialogOpenAtFirst}: {dialogOpenAtFirst: boolean}) {
        const [open, setOpen] = useState(dialogOpenAtFirst);

        return (
            <div data-testid="app-subtree">
                <ToastTrigger
                    label="Raise a persistent toast"
                    toast={{
                        message: "3 notifications have piled up.",
                        persistent: true,
                        severity: "info",
                    }}
                />
                <button onClick={() => setOpen(true)} type="button">
                    Open dialog
                </button>
                <Dialog open={open}>
                    <DialogContent>
                        Configure the external tool
                        <ToastTrigger
                            label="Test connection"
                            toast={{
                                message: "The connection test failed.",
                                severity: "error",
                            }}
                        />
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    it("should announce a toast raised from inside an already-open dialog", async () => {
        render(
            <ToastProvider>
                <DialogHarness dialogOpenAtFirst />
            </ToastProvider>,
        );

        fireEvent.click(screen.getByRole("button", {name: "Test connection"}));

        // The control that gives the next assertions their meaning: the dialog
        // really is hiding the application subtree from assistive technology,
        // which is exactly where the toast layer used to render.
        expect(
            ariaHiddenAncestor(screen.getByTestId("app-subtree")),
            "the dialog should be hiding the app subtree -- otherwise this case proves nothing",
        ).not.toBeNull();

        const toast = screen.getByTestId("toast");
        await waitFor(() => {
            expect(ariaHiddenAncestor(toast)).toBeNull();
        });
        // And therefore reachable by role, which is what an announcement is:
        // `getByRole` ignores anything under `aria-hidden`.
        expect(screen.getByRole("alert")).toBe(toast);
        expect(toast).toHaveTextContent("The connection test failed.");
    });

    it("should keep a toast that predates a dialog announced once the dialog opens", async () => {
        render(
            <ToastProvider>
                <DialogHarness dialogOpenAtFirst={false} />
            </ToastProvider>,
        );

        fireEvent.click(
            screen.getByRole("button", {name: "Raise a persistent toast"}),
        );
        const toast = screen.getByTestId("toast");
        expect(screen.getByRole("alert")).toBe(toast);

        // The layer already exists when the sweep runs, so a portal alone does
        // not save it: `ariaHiddenSiblings` iterates `container.children` at
        // modal-open time and hides everything it did not mount.
        fireEvent.click(screen.getByRole("button", {name: "Open dialog"}));

        expect(
            ariaHiddenAncestor(screen.getByTestId("app-subtree")),
            "the dialog should be hiding the app subtree -- otherwise this case proves nothing",
        ).not.toBeNull();
        await waitFor(() => {
            expect(ariaHiddenAncestor(toast)).toBeNull();
        });
        expect(screen.getByRole("alert")).toBe(toast);
        expect(toast).toHaveTextContent("3 notifications have piled up.");
    });
});
