import {fireEvent, render, screen} from "@testing-library/react";
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
