/*
 *  (C) Copyright 2026 TheOtherP (theotherp@posteo.net)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";

import {ToastProvider} from "./toasts/ToastProvider";
import {CopyValueButton} from "./CopyValueButton";

function renderButton(value: string | undefined, label = "query") {
    return render(
        <ToastProvider>
            <CopyValueButton label={label} testId="copy-value" value={value} />
        </ToastProvider>,
    );
}

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe("CopyValueButton", () => {
    it("renders nothing when navigator.clipboard is unavailable", () => {
        // jsdom does not implement the Clipboard API, so this is also the
        // environment's real default -- the branch every other case in this
        // file overrides with a stub.
        vi.stubGlobal("navigator", {});
        renderButton("some value");
        expect(screen.queryByTestId("copy-value")).not.toBeInTheDocument();
    });

    it("renders nothing when the value is empty", () => {
        const clipboard = {writeText: vi.fn().mockResolvedValue(undefined)};
        vi.stubGlobal("navigator", {clipboard});
        renderButton(undefined);
        expect(screen.queryByTestId("copy-value")).not.toBeInTheDocument();
        renderButton("");
        expect(screen.queryByTestId("copy-value")).not.toBeInTheDocument();
    });

    it("copies the exact value passed, names it in the accessible name, and confirms via a toast", async () => {
        const clipboard = {writeText: vi.fn().mockResolvedValue(undefined)};
        vi.stubGlobal("navigator", {clipboard});
        renderButton("192.0.2.5", "IP address");
        const button = screen.getByRole("button", {name: "Copy IP address"});
        expect(button).toHaveAttribute("data-testid", "copy-value");
        fireEvent.click(button);
        await vi.waitFor(() =>
            expect(clipboard.writeText).toHaveBeenCalledWith("192.0.2.5"),
        );
        expect(
            await screen.findByText("Copied IP address to clipboard."),
        ).toBeInTheDocument();
    });

    it("toasts a failure when the write rejects, the way DownloadActions does", async () => {
        const clipboard = {
            writeText: vi.fn().mockRejectedValue(new Error("denied")),
        };
        vi.stubGlobal("navigator", {clipboard});
        renderButton("192.0.2.5", "IP address");
        fireEvent.click(screen.getByRole("button", {name: "Copy IP address"}));
        expect(
            await screen.findByText("Failed to copy IP address to clipboard."),
        ).toBeInTheDocument();
    });

    it("is always in the DOM and reachable by keyboard alone, not only revealed on hover", () => {
        const clipboard = {writeText: vi.fn().mockResolvedValue(undefined)};
        vi.stubGlobal("navigator", {clipboard});
        renderButton("192.0.2.5", "IP address");
        const button = screen.getByRole("button", {name: "Copy IP address"});
        // No mouse involved -- this is the tab stop a hover-only reveal would
        // hide. A real button is a native tab stop by construction; focusing
        // it here proves it is reachable, not skipped, disabled or removed
        // from the tab order.
        button.focus();
        expect(document.activeElement).toBe(button);
        expect(button).not.toHaveAttribute("disabled");
        expect(button).not.toHaveAttribute("aria-hidden");
        expect(button).not.toHaveAttribute("tabindex", "-1");
    });
});
