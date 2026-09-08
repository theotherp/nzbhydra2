import {fireEvent, render, screen} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";

import {DialogProvider} from "../../components/dialogs/DialogProvider";
import {useConnectionFailurePrompt} from "./connectionFailurePrompt";

type Failure = {kind: "failed"; message: string} | {kind: "unchecked"};

function Trigger({
    failure,
    onCommit,
    subject,
}: {
    failure: Failure;
    onCommit: (answer: string) => void;
    subject: "downloader" | "indexer";
}) {
    const askToAddAnyway = useConnectionFailurePrompt(subject);

    return (
        <button
            onClick={async () => {
                const answer = await askToAddAnyway(failure);
                if (answer === "confirmed") {
                    onCommit(answer);
                }
            }}
            type="button"
        >
            Submit
        </button>
    );
}

function ask(
    failure: Failure,
    subject: "downloader" | "indexer" = "indexer",
): {onCommit: ReturnType<typeof vi.fn>} {
    const onCommit = vi.fn();
    render(
        <DialogProvider>
            <Trigger failure={failure} onCommit={onCommit} subject={subject} />
        </DialogProvider>,
    );
    fireEvent.click(screen.getByRole("button", {name: "Submit"}));
    return {onCommit};
}

describe("useConnectionFailurePrompt", () => {
    it("should show the server's failure message and the add-anyway question", () => {
        ask({kind: "failed", message: "401 Unauthorized"});

        const dialog = screen.getByTestId("config-indexer-connection-failed");
        expect(dialog).toHaveTextContent("Connection check failed");
        expect(dialog).toHaveTextContent("401 Unauthorized");
        expect(dialog).toHaveTextContent("Do you want to add it anyway?");
        expect(
            screen.getByRole("button", {name: "I know what I'm doing"}),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", {name: "Add it, but disabled"}),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", {name: "Aahh, let me try again"}),
        ).toBeInTheDocument();
    });

    it("should stand in for a failure the server did not explain", () => {
        ask({kind: "failed", message: ""}, "downloader");

        expect(
            screen.getByTestId("config-downloader-connection-failed"),
        ).toHaveTextContent(
            "The downloader rejected the connection but gave no reason.",
        );
    });

    it("should name the subject when the check never ran", () => {
        ask({kind: "unchecked"}, "downloader");

        const dialog = screen.getByTestId(
            "config-downloader-connection-failed",
        );
        expect(dialog).toHaveTextContent(
            "The connection to the downloader could not be tested, sorry. Please check the log.",
        );
        // The unchecked branch is the one that offers "I'll risk it".
        expect(
            screen.getByRole("button", {name: "I'll risk it"}),
        ).toBeInTheDocument();
    });

    it("should run the caller's follow-up on confirm and close the dialog", async () => {
        const {onCommit} = ask({kind: "unchecked"});

        fireEvent.click(screen.getByRole("button", {name: "I'll risk it"}));

        await vi.waitFor(() =>
            expect(onCommit).toHaveBeenCalledWith("confirmed"),
        );
        await vi.waitFor(() =>
            expect(
                screen.queryByTestId("config-indexer-connection-failed"),
            ).not.toBeInTheDocument(),
        );
    });

    it("should not run the caller's follow-up on cancel, and close the dialog", async () => {
        const {onCommit} = ask({kind: "failed", message: "no route to host"});

        fireEvent.click(
            screen.getByRole("button", {name: "Aahh, let me try again"}),
        );

        await vi.waitFor(() =>
            expect(
                screen.queryByTestId("config-indexer-connection-failed"),
            ).not.toBeInTheDocument(),
        );
        expect(onCommit).not.toHaveBeenCalled();
    });
});
