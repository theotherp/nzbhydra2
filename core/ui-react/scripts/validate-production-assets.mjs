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
import {resolve} from "node:path";

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

console.log(
    `Validated React production assets in ${outputDirectory} (entry assets: ${entryAssets.join(", ")}) against ${templateFile}`,
);
