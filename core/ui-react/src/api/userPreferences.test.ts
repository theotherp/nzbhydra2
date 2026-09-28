import {describe, expect, it, vi} from "vitest";

import {ApiTransport} from "./transport";
import {putUserPreferenceSection} from "./userPreferences";

describe("putUserPreferenceSection", () => {
    it("should put the section's value as JSON and survive the page closing", async () => {
        const fetchImplementation = vi
            .fn()
            .mockResolvedValue(new Response(null, {status: 200}));
        const transport = new ApiTransport("/hydra", fetchImplementation);

        await putUserPreferenceSection(transport, "searchResults", {
            compactRows: true,
        });

        expect(fetchImplementation).toHaveBeenCalledWith(
            "http://localhost:3000/hydra/internalapi/userpreferences/searchResults",
            expect.objectContaining({
                body: JSON.stringify({compactRows: true}),
                keepalive: true,
                method: "PUT",
            }),
        );
    });
});
