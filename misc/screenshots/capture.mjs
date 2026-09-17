/**
 * Captures the showcase screenshots linked from the readme.
 *
 * Expects a running mock-backed test instance and a UI in front of it -- by
 * default the React dev server on 5173, which proxies /internalapi to the
 * backend on 5076 (core/ui-react/vite/devBackend.ts). Point --base at 5076
 * directly to shoot the bundled UI instead.
 *
 *   node misc/screenshots/capture.mjs [--base http://localhost:5173]
 *                                     [--out misc/screenshots] [--no-seed]
 *
 * Seeding drives the UI the way a user would: it runs a handful of searches
 * and sends a few results to the configured downloader, so that the history
 * and stats pages have something to show. Only do that against a throwaway
 * mock instance -- it writes to that instance's database.
 */
import {mkdir} from "node:fs/promises";
import {dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";

import {chromium} from "../../tests/system/node_modules/@playwright/test/index.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const argValue = (name, fallback) => {
    const index = args.indexOf(name);
    return index === -1 ? fallback : args[index + 1];
};

const baseUrl = argValue("--base", "http://localhost:5173");
// The readme links these by name, so a re-run replaces them in place.
const outDir = resolve(here, argValue("--out", "."));
const seed = !args.includes("--no-seed");

/** Wide enough for the results table's own columns plus the refine sidebar. */
const viewport = {width: 1600, height: 950};

/** Queries the mock answers with a full page of quality-worded movie results. */
const movieQuery = "movies";

// Kept away from the categories whose size presets reject every mock result
// (Movies is 3000-40000 MB, the mock's are tens to hundreds of MB), so that the
// searches seeded here all leave a row with results behind them.
const seedSearches = [
    {query: "movies", category: null},
    {query: "big buck bunny", category: null},
    {query: "tv", category: "TV"},
    {query: "sintel", category: null},
    {query: "cosmos", category: "Audio"},
];

async function settle(page) {
    await page.addStyleTag({
        content: [
            "*, *::before, *::after { animation: none !important; transition: none !important; }",
            // Seeding leaves a trail of "was downloaded from indexer" toasts,
            // which are incidental to every page being captured.
            ".MuiSnackbar-root { display: none !important; }",
        ].join("\n"),
    });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(500);
}

async function shoot(page, name, options = {}) {
    await settle(page);
    const path = `${outDir}/${name}.png`;
    await page.screenshot({path, ...options});
    console.log(`  -> ${name}.png`);
}

async function dismissWelcome(page) {
    const dialog = page
        .getByRole("dialog")
        .filter({hasText: "Welcome to NZBHydra 2"});
    if (await dialog.isVisible().catch(() => false)) {
        await dialog.getByRole("button", {name: "Close", exact: true}).click();
        await dialog.waitFor({state: "hidden"});
    }
}

/** The one-time "Sorting of TV episodes" dialog would cover the results table. */
async function silenceEpisodeHelp(page) {
    const token = (await page.context().cookies()).find(
        (cookie) => cookie.name === "HYDRA-XSRF-TOKEN",
    )?.value;
    if (token === undefined) {
        return;
    }
    await page.request
        .put("/internalapi/genericstorage/isGroupEpisodesHelpShown?forUser=true", {
            data: true,
            headers: {"X-XSRF-TOKEN": token},
        })
        .catch(() => {
        });
}

async function chooseCategory(page, category) {
    if (category === null) {
        return;
    }
    const control = page.getByTestId("search-category-control");
    await control.click();
    await page
        .getByRole("option", {name: category, exact: true})
        .click()
        .catch(async () => {
            await page.keyboard.press("Escape");
        });
}

async function runSearch(page, {query, category = null}) {
    await page.goto("/");
    await page.getByTestId("search-query").waitFor();
    await chooseCategory(page, category);
    await page.getByTestId("search-query").fill(query);
    const response = page.waitForResponse(
        (candidate) =>
            candidate.request().method() === "POST" &&
            new URL(candidate.url()).pathname === "/internalapi/search",
        {timeout: 120_000},
    );
    await page.getByTestId("search-submit").click();
    await response;
    await page
        .getByTestId("search-status-modal")
        .waitFor({state: "hidden", timeout: 120_000})
        .catch(() => {
        });
    await page
        .getByTestId("search-results-table")
        .waitFor({timeout: 60_000})
        .catch(() => console.log(`  (no results for "${query}")`));
}

/**
 * Fills the download history by fetching result rows' own NZB/torrent links.
 *
 * Not the per-row "send to downloader" button: with the instance's `REDIRECT`
 * NZB access type that hands the downloader a link and leaves no history entry
 * behind until the downloader itself fetches it -- which the SABnzbd mock never
 * does. Requesting the link is exactly what the row's download icon does.
 */
async function seedDownloads(page, testId, count) {
    const links = page.getByTestId(testId);
    const available = Math.min(count, await links.count());
    for (let index = 0; index < available; index++) {
        const href = await links.nth(index).getAttribute("href");
        if (href === null) {
            continue;
        }
        await page.request.get(href).catch(() => {
        });
    }
    return available;
}

const browser = await chromium.launch();
const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 2,
    baseURL: baseUrl,
    // The history tables print absolute timestamps; pin them so repeated runs
    // do not differ only by the machine's zone.
    timezoneId: "Europe/Berlin",
    locale: "en-US",
});
const page = await context.newPage();

await mkdir(outDir, {recursive: true});

await page.goto("/");
await dismissWelcome(page);
await page.getByTestId("search-query").waitFor();
await silenceEpisodeHelp(page);
await page.emulateMedia({reducedMotion: "reduce"});

if (seed) {
    for (const search of seedSearches) {
        console.log(`Seeding search "${search.query}"`);
        await runSearch(page, search);
    }
    console.log("Seeding downloads");
    await runSearch(page, {query: movieQuery});
    console.log(`  ${await seedDownloads(page, "download-nzb", 8)} NZBs`);
    console.log(`  ${await seedDownloads(page, "download-torrent", 3)} torrents`);
}

// 1. The search form, with the advanced controls open so the screenshot shows
//    what a search can be refined by before it is run, and 2. the same form
//    with the query autocomplete open.
console.log("Capturing search form");
await page.goto("/");
await page.getByTestId("search-query").waitFor();
const advancedToggle = page.getByTestId("search-advanced-toggle");
if ((await advancedToggle.getAttribute("aria-expanded")) === "false") {
    await advancedToggle.click();
}
await page.getByTestId("search-advanced-panel").waitFor();
// A category with a media refinement, so the panel shows all three of its
// zones rather than an empty one where season/episode would be.
await chooseCategory(page, "TV");
await page.getByTestId("search-query").fill("breaking bad");
await page
    .getByTestId("autocomplete-popup")
    .waitFor({timeout: 15_000})
    .catch(() => console.log("  (no autocomplete)"));
const formClip = async () => {
    const box = await page.getByTestId("search-workspace").boundingBox();
    return {
        clip: {
            x: 0,
            y: 0,
            width: viewport.width,
            height: Math.ceil((box?.y ?? 0) + (box?.height ?? 0) + 40),
        },
    };
};
await shoot(page, "02-search-suggestions", await formClip());
// Blurring the field closes the autocomplete; Escape would close it by
// clearing the query along with it.
await page.evaluate(() => document.activeElement?.blur());
await page
    .getByTestId("autocomplete-popup")
    .waitFor({state: "hidden", timeout: 5_000})
    .catch(() => {
    });
await shoot(page, "01-search-form", await formClip());

// 2. Results, with the refine sidebar open and a quality filter applied.
console.log("Capturing results");
await runSearch(page, {query: movieQuery});
// The advanced panel remembers its open state in localStorage, and left open
// it pushes most of the result table out of the viewport.
if ((await advancedToggle.getAttribute("aria-expanded")) === "true") {
    await advancedToggle.click();
    await page.getByTestId("search-advanced-panel").waitFor({state: "hidden"});
}
const sidebarToggle = page.getByTestId("refine-sidebar-toggle");
if (
    (await sidebarToggle.isVisible().catch(() => false)) &&
    (await sidebarToggle.getAttribute("aria-expanded")) === "false"
) {
    await sidebarToggle.click();
}
const qualityChip = page
    .getByTestId("refine-quality-filters")
    .getByRole("button", {name: "1080p", exact: true});
if (await qualityChip.isVisible().catch(() => false)) {
    await qualityChip.click();
    await page.waitForTimeout(500);
}
await shoot(page, "03-results");

// 3-6. The pages that only need to be visited.
for (const [name, path] of [
    ["04-config", "/config/main"],
    ["05-search-history", "/stats/searches"],
    ["06-download-history", "/stats/downloads"],
]) {
    console.log(`Capturing ${path}`);
    await page.goto(path);
    await page.waitForLoadState("networkidle").catch(() => {
    });
    await shoot(page, name);
}

// The stats page is mostly charts below the fold, so it is the one page worth
// capturing in full rather than at viewport height.
console.log("Capturing /stats/stats");
await page.goto("/stats/stats");
await page.waitForLoadState("networkidle").catch(() => {
});
await page.waitForTimeout(1500);
// The charts draw themselves when they are scrolled into view, so a full-page
// screenshot taken straight away catches most of them empty.
for (let step = 0; step < 12; step++) {
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(400);
}
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(800);
await page.addStyleTag({
    content:
    // Sticky, so on a full-page screenshot it would sit across the middle
    // of the page rather than at the bottom of the viewport.
        "[data-testid=\"downloader-status-footer\"] { display: none !important; }",
});
await shoot(page, "07-stats", {fullPage: true});

await browser.close();
console.log(`done -- ${outDir}`);
