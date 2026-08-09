import {fireEvent, render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {ToastProvider} from "./ToastProvider";
import {useToasts} from "./toasts";

function ToastTrigger() {
    const toasts = useToasts();

    return (
        <button
            onClick={() =>
                toasts.showToast({message: "Saved search", severity: "success"})
            }
            type="button"
        >
            Save
        </button>
    );
}

describe("ToastProvider", () => {
    it("should render a severity-labelled notification", () => {
        render(
            <ToastProvider>
                <ToastTrigger />
            </ToastProvider>,
        );

        fireEvent.click(screen.getByRole("button", {name: "Save"}));

        expect(screen.getByRole("alert")).toHaveTextContent("Saved search");
    });
});
