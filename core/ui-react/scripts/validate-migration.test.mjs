import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

import {parse} from "yaml";
import {
    parityStates,
    statusSections,
    validateParity,
    validateVisualEvidenceContainment,
} from "./validate-migration.mjs";

function parityErrors(...records) {
    const errors = [];
    validateParity(records, (message) => errors.push(message));
    return errors;
}

test("accepts every parity state the registries actually use", async () => {
    for (const [file, collection] of [
        ["FEATURES.yaml", "features"],
        ["COMPONENTS.yaml", "components"],
    ]) {
        const registry = parse(
            await readFile(`../../docs/frontend-migration/${file}`, "utf8"),
        );
        assert.deepEqual(parityErrors(...registry[collection]), []);
    }
});

test("rejects an unknown parity state", () => {
    assert.match(
        parityErrors({id: "F-TEST", parity: "almost"}).join("\n"),
        /unknown parity\/state/,
    );
});

test("knows the documented parity states", () => {
    assert.ok(parityStates.has("partial"));
    assert.ok(parityStates.has("inventoried"));
    assert.ok(!parityStates.has("accepted"));
});

function containmentErrors(helperSource, configSource) {
    const errors = [];
    validateVisualEvidenceContainment(helperSource, configSource, (message) =>
        errors.push(message),
    );
    return errors;
}

test("accepts the actual evidence root and Playwright config", async () => {
    assert.deepEqual(
        containmentErrors(
            await readFile(
                "../../tests/system/tests/visualEvidence.ts",
                "utf8",
            ),
            await readFile("../../tests/system/playwright.config.ts", "utf8"),
        ),
        [],
    );
});

test("rejects an evidence root inside Playwright's default output directory", () => {
    assert.match(
        containmentErrors(
            'export const visualEvidenceRoot = "test-results/visual-evidence";',
            "export default defineConfig({});",
        ).join("\n"),
        /inside Playwright's cleared output directory test-results/,
    );
});

test("rejects an evidence root inside an explicitly configured outputDir", () => {
    assert.match(
        containmentErrors(
            'export const visualEvidenceRoot = "artifacts/evidence";',
            'export default defineConfig({outputDir: "artifacts"});',
        ).join("\n"),
        /inside Playwright's cleared output directory artifacts/,
    );
});

test("accepts a sibling evidence root outside an explicit outputDir", () => {
    assert.deepEqual(
        containmentErrors(
            'export const visualEvidenceRoot = "visual-evidence";',
            'export default defineConfig({outputDir: "test-results"});',
        ),
        [],
    );
});

test("reports a helper that no longer exposes the evidence root", () => {
    assert.match(
        containmentErrors(
            'const somethingElse = "visual-evidence";',
            "export default defineConfig({});",
        ).join("\n"),
        /must export a string literal visualEvidenceRoot/,
    );
});

test("parses STATUS.md sections", () => {
    const sections = statusSections(
        ["## Active", "", "None.", "## Upcoming", "- FM-022: Something"].join(
            "\n",
        ),
    );
    assert.deepEqual(sections.get("Upcoming"), ["FM-022"]);
    assert.deepEqual(sections.get("Active"), []);
});
