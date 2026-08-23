import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    Link,
} from "@mui/material";
import {act, cleanup, fireEvent, render, screen} from "@testing-library/react";
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
        // Queried by test id, not by role: MUI's modal manager marks every
        // body child outside the dialog `aria-hidden` while it is open, which
        // predates this change and is recorded as follow-up work.
        expect(screen.getByTestId("toast")).toBeInTheDocument();

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

    it("should render rich content with an internal link and report its close", () => {
        const onClose = vi.fn();
        render(
            <ToastProvider>
                <ToastTrigger
                    label="Pile up"
                    toast={{
                        content: (
                            <>
                                3 notifications have piled up.{" "}
                                <Link
                                    color="inherit"
                                    href="/stats/notifications"
                                >
                                    Go to the notification history to view them.
                                </Link>
                            </>
                        ),
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
        expect(
            screen.getByRole("link", {
                name: "Go to the notification history to view them.",
            }),
        ).toHaveAttribute("href", "/stats/notifications");

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
