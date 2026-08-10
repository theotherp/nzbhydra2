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

import {access, readFile, stat} from "node:fs/promises";
import {resolve} from "node:path";

const outputDirectory = resolve(process.env.VITE_OUT_DIR ?? "dist");
const entryAsset = resolve(outputDirectory, "assets/index.js");
const htmlFile = resolve(outputDirectory, "index.html");

await access(entryAsset);
if ((await stat(entryAsset)).size === 0) {
    throw new Error(`React entry asset is empty: ${entryAsset}`);
}

const html = await readFile(htmlFile, "utf8");
if (!html.includes("assets/index.js")) {
    throw new Error(
        `React production HTML does not reference its entry asset: ${htmlFile}`,
    );
}

console.log(`Validated React production assets in ${outputDirectory}`);
