import AddCircleOutlineOutlinedIcon from "@mui/icons-material/AddCircleOutlineOutlined";
import ChatBubbleOutlineOutlinedIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import HelpOutlineOutlinedIcon from "@mui/icons-material/HelpOutlineOutlined";
import {render} from "@testing-library/react";
import type {ReactElement} from "react";
import {describe, expect, it} from "vitest";

import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";

/*
 * ---------------------------------------------------------------------------
 * FM-183: the glyph, not the module name.
 * ---------------------------------------------------------------------------
 *
 * `@mui/material` 9 removed the 23 legacy `*Outline` icon exports this
 * codebase imported by path (`HelpOutline`, `ErrorOutline`, `AddCircleOutline`,
 * `ChatBubbleOutline`, `CheckCircleOutline`). The successor file is
 * `*OutlineOutlined` -- NOT `*Outlined`, which is the *filled* member of each
 * of these families and is what a name-driven repoint lands on. Nothing else
 * in this repository renders these icons under test, so a silent swap from an
 * outlined to a filled glyph passes every other gate.
 *
 * Each expected `d` below is the literal path string shipped by
 * `@mui/icons-material@7.3.9`'s legacy module (read out of the published
 * tarball), so this file pins the pre-upgrade glyph rather than the current
 * package's opinion of it.
 */
const LEGACY_7_3_9_PATHS = {
    HelpOutline:
        "M11 18h2v-2h-2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8m0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4",
    ErrorOutline:
        "M11 15h2v2h-2zm0-8h2v6h-2zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2M12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8",
    AddCircleOutline:
        "M13 7h-2v4H7v2h4v4h2v-4h4v-2h-4zm-1-5C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8",
    ChatBubbleOutline:
        "M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2m0 14H6l-2 2V4h16z",
} as const;

/*
 * The one family whose glyph could not be preserved byte for byte. 7.3.9's
 * legacy `CheckCircleOutline` module shipped an older cut of the Material
 * glyph (a one-unit-thicker check, the check drawn as the first subpath);
 * `CheckCircleOutlineOutlined` carried the newer cut already in 7.3.9, and no
 * module in 9.4.0 ships the legacy string at all (verified by grepping every
 * `@mui/icons-material@9.4.0` module for it). The two are the same drawing --
 * an outlined circle enclosing a check -- and this is the closest available
 * successor. Pinned so the difference stays a decision rather than a drift.
 */
const CHECK_CIRCLE_OUTLINE_OUTLINED_9_4_0 =
    "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8m4.59-12.42L10 14.17l-2.59-2.58L6 13l4 4 8-8z";

const CHECK_CIRCLE_OUTLINE_7_3_9 =
    "M16.59 7.58 10 14.17l-3.59-3.58L5 12l5 5 8-8zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8";

const pathOf = (element: ReactElement): string => {
    const {container, unmount} = render(element);
    const paths = container.querySelectorAll("path");
    expect(paths).toHaveLength(1);
    const d = paths[0].getAttribute("d") ?? "";
    unmount();
    return d;
};

describe("legacy *Outline icon successors", () => {
    it("HelpOutlineOutlined renders 7.3.9's HelpOutline glyph", () => {
        expect(pathOf(<HelpOutlineOutlinedIcon />)).toBe(
            LEGACY_7_3_9_PATHS.HelpOutline,
        );
    });

    it("ErrorOutlineOutlined renders 7.3.9's ErrorOutline glyph", () => {
        expect(pathOf(<ErrorOutlineOutlinedIcon />)).toBe(
            LEGACY_7_3_9_PATHS.ErrorOutline,
        );
    });

    it("AddCircleOutlineOutlined renders 7.3.9's AddCircleOutline glyph", () => {
        expect(pathOf(<AddCircleOutlineOutlinedIcon />)).toBe(
            LEGACY_7_3_9_PATHS.AddCircleOutline,
        );
    });

    it("ChatBubbleOutlineOutlined renders 7.3.9's ChatBubbleOutline glyph", () => {
        expect(pathOf(<ChatBubbleOutlineOutlinedIcon />)).toBe(
            LEGACY_7_3_9_PATHS.ChatBubbleOutline,
        );
    });

    it("CheckCircleOutlineOutlined renders the newer cut of the same outlined check-circle", () => {
        const rendered = pathOf(<CheckCircleOutlineOutlinedIcon />);
        expect(rendered).toBe(CHECK_CIRCLE_OUTLINE_OUTLINED_9_4_0);
        expect(rendered).not.toBe(CHECK_CIRCLE_OUTLINE_7_3_9);
    });
});

/*
 * The render assertions above prove which glyph a module ships; these prove
 * that the sites still import that module. Together they are what stops a
 * repoint onto the filled `*Outlined` file from passing unnoticed.
 */
const SITES: ReadonlyArray<readonly [string, readonly string[]]> = [
    ["../features/config/categories/CategoriesTable.tsx", ["ErrorOutline"]],
    ["../features/config/components/ChipsSetting.tsx", ["ErrorOutline"]],
    ["../features/config/components/ConfigFieldset.tsx", ["HelpOutline"]],
    ["../features/config/components/SettingRow.tsx", ["HelpOutline"]],
    ["../features/config/indexers/AddIndexerDialog.tsx", ["AddCircleOutline"]],
    [
        "../features/config/indexers/IndexerTable.tsx",
        ["ErrorOutline", "HelpOutline"],
    ],
    ["../features/search/results/ResultDetailLinks.tsx", ["ChatBubbleOutline"]],
    ["../features/stats/dashboard/ChartCard.tsx", ["HelpOutline"]],
    [
        "../features/stats/history/DownloadHistoryPage.tsx",
        ["CheckCircleOutline", "ErrorOutline", "HelpOutline"],
    ],
    ["../features/system/bugreport/CpuUsageCard.tsx", ["HelpOutline"]],
];

describe("legacy *Outline icon sites", () => {
    it.each(SITES)(
        "%s imports the outlined successor module",
        (file, families) => {
            const source = readFileSync(
                fileURLToPath(new URL(file, import.meta.url)),
                "utf8",
            );
            for (const family of families) {
                expect(source).toContain(
                    `from "@mui/icons-material/${family}Outlined"`,
                );
                expect(source).not.toMatch(
                    new RegExp(
                        `from "@mui/icons-material/${family.replace("Outline", "")}Outlined"`,
                    ),
                );
            }
        },
    );
});
