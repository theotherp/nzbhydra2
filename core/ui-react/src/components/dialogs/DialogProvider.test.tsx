import {fireEvent, render, screen} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";

import {DialogProvider} from "./DialogProvider";
import {useDialogs} from "./dialogs";

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
});
