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

import {readdir, readFile, stat} from "node:fs/promises";
import {basename, resolve} from "node:path";

const outputDirectory = resolve(process.env.VITE_OUT_DIR ?? "dist");
const assetDirectory = resolve(outputDirectory, "assets");

// ADR-0010 (Option A, accepted): validate the HTML production actually serves.
// Spring renders `MainWeb.shell()`'s `"react"` view, i.e. this Thymeleaf
// template -- never the `index.html` Vite writes into the output directory,
// which is packaged but unused. The path is resolved from the `core/ui-react`
// working directory both invocations use (Maven's `validate-react-assets` with
// `VITE_OUT_DIR=../target/classes/static/react` and CI's default `dist/`), so
// it is independent of where the build output lands.
const templateFile = resolve("../src/main/resources/templates/react.html");

// An "entry asset" is a top-level asset in `assets/` whose name carries no
// content hash: `index.js`, pinned by `vite.config.ts`'s
// `entryFileNames: "assets/[name].js"`, and `index.css`, pinned by its
// `assetFileNames` CSS rule. Those two -- and only those two -- are hardcoded
// by the template, so those are the ones it must reference. Every other emitted
// asset keeps Vite's default `-[hash]` suffix: the `@fontsource` webfont files
// (referenced from the CSS) and any future route-level code-split JS/CSS chunk
// (loaded by Vite's own module-preload runtime). Requiring those in the
// template would be wrong, so they are deliberately not checked here.
const entryAssetPattern = /^index\.[^.]+$/;

const emittedAssets = await readdir(assetDirectory);
const entryAssets = emittedAssets.filter((name) =>
    entryAssetPattern.test(name),
);
entryAssets.sort();

if (!entryAssets.includes("index.js")) {
    throw new Error(
        `React entry asset is missing: ${resolve(assetDirectory, "index.js")}`,
    );
}

const html = await readFile(templateFile, "utf8");

for (const asset of entryAssets) {
    const assetFile = resolve(assetDirectory, asset);
    if ((await stat(assetFile)).size === 0) {
        throw new Error(`React entry asset is empty: ${assetFile}`);
    }

    const reference = `static/react/assets/${asset}`;
    if (!html.includes(reference)) {
        throw new Error(
            `React production HTML does not reference emitted entry asset ${reference}: ${templateFile}`,
        );
    }
}

// FM-163: every emitted JavaScript file other than the pinned entry has to
// keep its content hash. `entryFileNames` pins `index.js` on purpose (the
// template hardcodes it); a second unhashed name would either collide with
// that pin or become a second asset the template would have to know about,
// which is exactly what ADR-0010 rules out.
const hashedChunkPattern = /-[A-Za-z0-9_-]{8}\.js$/;
const unhashedChunks = emittedAssets.filter(
    (name) =>
        name.endsWith(".js") &&
        name !== "index.js" &&
        !hashedChunkPattern.test(name),
);
if (unhashedChunks.length > 0) {
    throw new Error(
        `React build emitted unhashed JavaScript besides the pinned entry (ADR-0010): ${unhashedChunks.join(", ")} in ${assetDirectory}`,
    );
}

// FM-163: the chart engine (`@mui/x-charts` and the `d3-*` packages under it)
// must not be on the critical path. It is roughly 40% of what the entry used
// to weigh, and a session that only searches never draws a chart -- the stats
// dashboard, the bugreport CPU card and the downloader footer's sparkline all
// reach it through a dynamic `import()` now.
//
// The check walks the entry's *static* import closure rather than looking at
// `index.js` alone, because splitting a chunk out is not the same as taking it
// off the critical path: an `output.manualChunks` group that the entry still
// statically imports shows up as a separate, satisfyingly small file in the
// build listing while the browser downloads exactly as much as before. Only
// files the entry does not statically pull in are actually deferred.
//
// Markers are string literals from the two package families that survive
// minification: MUI's chart class-name prefixes, and one of `d3-color`'s named
// colours for the d3 side (nothing else in this application ships a CSS colour
// table).
const chartMarkers = [
    "MuiChartsSurface",
    "MuiChartsAxis",
    "MuiChartsTooltip",
    "MuiBarChart",
    "MuiSparkLineChart",
    "rebeccapurple",
];

// `import ... from "./chunk.js"`, `export ... from "./chunk.js"` and the
// side-effect `import "./chunk.js"` are the static forms; `import("./chunk.js")`
// is deliberately not matched -- being dynamic is the whole point.
const staticImportPatterns = [
    /\bfrom\s*["']([^"']+\.js)["']/g,
    /(?:^|[;}\s])import\s*["']([^"']+\.js)["']/g,
];

const criticalPathChunks = new Set();
const pending = ["index.js"];
while (pending.length > 0) {
    const chunk = pending.pop();
    if (criticalPathChunks.has(chunk)) {
        continue;
    }
    criticalPathChunks.add(chunk);
    const source = await readFile(resolve(assetDirectory, chunk), "utf8");
    for (const pattern of staticImportPatterns) {
        for (const match of source.matchAll(pattern)) {
            pending.push(basename(match[1]));
        }
    }
}

for (const chunk of [...criticalPathChunks].sort()) {
    const source = await readFile(resolve(assetDirectory, chunk), "utf8");
    const found = chartMarkers.filter((marker) => source.includes(marker));
    if (found.length > 0) {
        throw new Error(
            `React entry chunk loads chart code before it can paint: ${resolve(assetDirectory, chunk)} contains ${found.join(", ")}. ` +
                `\`@mui/x-charts\` and its \`d3-*\` dependencies must stay behind a dynamic \`import()\` (FM-163); ` +
                `a chunk the entry still imports statically is on the critical path even though it has its own file name.`,
        );
    }
}

console.log(
    `Validated React production assets in ${outputDirectory} (entry assets: ${entryAssets.join(", ")}) against ${templateFile}`,
);
console.log(
    `Validated that no chart code is on the critical path (${criticalPathChunks.size} chunk(s) the entry loads statically, ${emittedAssets.filter((name) => name.endsWith(".js")).length} emitted JavaScript files in total)`,
);
